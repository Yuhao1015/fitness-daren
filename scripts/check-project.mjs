// 静态检查：开发者工具编译时才会暴露的「文件缺失」类问题，在这里提前发现。
// 1. app.json 里的页面与分包页面，必须有 .ts / .wxml / .wxss（缺 .json 允许，页面 json 可选）
// 2. 所有 usingComponents 指向的组件必须有 .json / .ts / .wxml
// 3. 所有 <wxs src="..."> 必须存在
// 4. wxml 里写死的 /assets/... 图片必须存在
// 无输出 = 通过；有问题时打印清单并以退出码 1 结束。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mp = path.join(root, 'miniprogram');
const problems = [];
const exists = (rel) => fs.existsSync(path.join(mp, rel));
const read = (rel) => fs.readFileSync(path.join(mp, rel), 'utf8');

const app = JSON.parse(read('app.json'));
const pages = [...app.pages, ...(app.subPackages || []).flatMap((p) => p.pages.map((x) => `${p.root}/${x}`))];
for (const p of pages) {
  for (const ext of ['ts', 'wxml', 'wxss']) if (!exists(`${p}.${ext}`)) problems.push(`页面缺文件：${p}.${ext}`);
}

const comps = new Map();
const addComps = (using, from) => {
  for (const [name, p] of Object.entries(using || {})) comps.set(p.startsWith('/') ? p.slice(1) : path.posix.join(path.posix.dirname(from), p), `${from} 的 ${name}`);
};
addComps(app.usingComponents, 'app.json');
for (const p of pages) if (exists(`${p}.json`)) addComps(JSON.parse(read(`${p}.json`)).usingComponents, `${p}.json`);
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
};
const all = walk(mp).map((f) => path.relative(mp, f).split(path.sep).join('/'));
for (const f of all.filter((x) => x.endsWith('.json') && /^(components|custom-tab-bar)\//.test(x))) addComps(JSON.parse(read(f)).usingComponents, f);
for (const [c, from] of comps) {
  for (const ext of ['json', 'ts', 'wxml']) if (!exists(`${c}.${ext}`)) problems.push(`组件缺文件：${c}.${ext}（被 ${from} 引用）`);
}

for (const f of all.filter((x) => x.endsWith('.wxml'))) {
  const src = read(f);
  for (const m of src.matchAll(/<wxs\b[^>]*\bsrc="([^"]+)"/g)) {
    const target = path.posix.join(path.posix.dirname(f), m[1]);
    if (!exists(target)) problems.push(`wxs 不存在：${target}（被 ${f} 引用）`);
  }
  for (const m of src.matchAll(/\bsrc="(\/assets\/[^"{}]+)"/g)) {
    if (!exists(m[1].slice(1))) problems.push(`图片不存在：${m[1]}（被 ${f} 引用）`);
  }
}

if (problems.length) {
  console.log('项目文件检查未通过：\n' + problems.join('\n'));
  process.exit(1);
}
