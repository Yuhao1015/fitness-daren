// 浏览器预览工具（仅开发用，不属于小程序本体）：
// 把 miniprogram/ 下的 TS 打包成浏览器可跑的 ESM，并把 wxml / wxss / json / wxs 收集成一个 assets.json，
// 供 runtime.js 在浏览器里模拟小程序的页面、组件与 wx.* 接口。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const mp = path.join(root, 'miniprogram');
const dist = path.join(here, 'dist');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (f) => path.relative(mp, f).split(path.sep).join('/');

/** wxss -> css：展开 @import、rpx 变成 calc、page 选择器改成视口、env(safe-area) 改成变量 */
function wxssToCss(file, seen = new Set()) {
  if (seen.has(file)) return '';
  seen.add(file);
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/@import\s+['"](.+?)['"]\s*;?/g, (_, p) => wxssToCss(path.resolve(path.dirname(file), p), seen));
  css = css.replace(/(-?\d*\.?\d+)rpx/g, (_, n) => `calc(${n} * var(--rpx))`);
  css = css.replace(/(^|[}\s,])page(?=\s*[{,])/g, '$1.wx-viewport');
  css = css.replace(/env\(safe-area-inset-bottom\)/g, 'var(--safe-bottom)');
  return css;
}

/** 组件样式默认隔离：用 CSS 嵌套把规则限定在组件宿主标签内，避免和页面里同名的类（如 .tip）互相污染 */
function scopeComponentCss(key, css) {
  const tag = key.startsWith('custom-tab-bar') ? 'custom-tab-bar' : key.split('/')[1];
  const hoisted = [];
  const body = css.replace(/@keyframes[^{]+{(?:[^{}]*{[^{}]*})*[^{}]*}/g, (m) => {
    hoisted.push(m);
    return '';
  });
  return [...hoisted, tag + ' {', body, '}'].join(String.fromCharCode(10));
}

/**
 * 预览里把「云开发环境」和「订阅消息模板」填成占位值：这样应用会走云端分支（由 mock-cloud.mjs 接住），
 * 提醒入口也会显示。真正的 config.ts 不受影响；面板里的「云端」开关关掉时 wx.cloud 不存在，应用回到纯本地模式。
 */
function previewConfigPlugin() {
  return {
    name: 'preview-config',
    setup(b) {
      b.onLoad({ filter: /miniprogram[\\/]config\.ts$/ }, (args) => {
        let src = fs.readFileSync(args.path, 'utf8');
        src = src.replace("export const CLOUD_ENV = '';", "export const CLOUD_ENV = 'preview';");
        src = src.replace(/(trainReminder|challengeReminder|nudge): ''/g, "$1: 'preview-template'");
        return { contents: src, loader: 'ts' };
      });
    },
  };
}

/** 有「本地云」模拟才把云开发环境填成占位值；没有（只开源前端的副本）就保持 config.ts 原样 = 纯本地模式 */
const hasMockCloud = () => fs.existsSync(path.join(here, 'mock-cloud.mjs'));

export async function build() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'js'), { recursive: true });

  const files = walk(mp);
  const templates = {};
  const wxs = {};
  for (const f of files) {
    const r = rel(f);
    const ext = path.extname(r);
    const key = r.slice(0, -ext.length);
    if (r.startsWith('assets/') || r.startsWith('core/') || r.startsWith('services/') || r.startsWith('viewmodels/') || r.startsWith('styles/')) continue;
    if (ext === '.wxml') (templates[key] ??= {}).wxml = fs.readFileSync(f, 'utf8');
    else if (ext === '.wxss') {
      const css = wxssToCss(f);
      (templates[key] ??= {}).css = /^(components|custom-tab-bar)\//.test(key) ? scopeComponentCss(key, css) : css;
    }
    else if (ext === '.json' && r !== 'app.json' && r !== 'sitemap.json') (templates[key] ??= {}).json = JSON.parse(fs.readFileSync(f, 'utf8'));
    else if (ext === '.wxs') wxs[r] = fs.readFileSync(f, 'utf8');
  }
  const app = JSON.parse(fs.readFileSync(path.join(mp, 'app.json'), 'utf8'));
  const appCss = wxssToCss(path.join(mp, 'app.wxss'));
  fs.writeFileSync(path.join(dist, 'assets.json'), JSON.stringify({ app, appCss, templates, wxs }));

  // 所有页面 / 组件的 TS 入口，运行时按需 import()
  const modules = files.filter((f) => f.endsWith('.ts') && /^(pages|components|custom-tab-bar|pkg-[a-z]+)\//.test(rel(f))).map(rel);
  const entry = [
    `import { boot } from '../../runtime.js';`,
    `import '../../../../miniprogram/app.ts';`,
    `import { seedDemo, seedFresh } from '../../seed.ts';`,
    `window.__seed = { demo: () => seedDemo(false), demoDone: () => seedDemo(true), fresh: seedFresh };`,
    `window.__MOCK_CLOUD = ${hasMockCloud()};`,
    `window.__MODS = {`,
    ...modules.map((m) => `  ${JSON.stringify(m.replace(/\.ts$/, ''))}: () => import(${JSON.stringify('../../../../miniprogram/' + m)}),`),
    `};`,
    `boot().catch((e) => { console.error(e); document.body.dataset.bootError = String(e && e.stack || e); });`,
  ].join('\n');
  fs.mkdirSync(path.join(dist, 'gen'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'gen', 'entry.js'), entry);

  await esbuild.build({
    entryPoints: [path.join(dist, 'gen', 'entry.js')],
    bundle: true,
    format: 'esm',
    splitting: true,
    outdir: path.join(dist, 'js'),
    target: 'es2020',
    sourcemap: true,
    logLevel: 'warning',
    absWorkingDir: root,
    plugins: hasMockCloud() ? [previewConfigPlugin()] : [],
  });

  fs.cpSync(path.join(mp, 'assets'), path.join(dist, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(here, 'index.html'), path.join(dist, 'index.html'));
  fs.copyFileSync(path.join(here, 'frame.css'), path.join(dist, 'frame.css'));
  return { modules: modules.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await build();
  console.log(`preview built: ${r.modules} page/component modules -> tools/preview/dist`);
}
