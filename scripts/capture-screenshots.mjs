// 用本机的 Chrome / Edge（无头）驱动浏览器预览，给主页 README 截界面图。没有额外依赖：Node 24 自带 WebSocket。
//   node scripts/capture-screenshots.mjs [输出目录]        默认 publish/images
// 需要预览服务已经在 5174 端口运行（npm run preview）。每张图是 #phone（状态栏 + 胶囊 + 页面）的 2 倍图，外面合成一圈手机边框，背景透明。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, '../publish/images'));
const BASE = process.env.PREVIEW_URL || 'http://localhost:5174/';
const SCALE = 2;
const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = process.env.BROWSER_PATH || BROWSERS.find((p) => fs.existsSync(p));
if (!exe) throw new Error('找不到 Chrome / Edge，请用 BROWSER_PATH 指定');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-'));
const proc = spawn(exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-gpu', '--window-size=900,1000', 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('浏览器调试端口没有起来');
}

const ws = new WebSocket(await connect());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const waiting = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) {
    const { res, rej } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1000, deviceScaleFactor: SCALE, mobile: false });

/** 打开一个预览地址并等应用启动完成 */
async function open(hashAndQuery) {
  await send('Page.navigate', { url: BASE + hashAndQuery });
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    const ok = await evaluate(`document.body && document.body.classList.contains('ready')`).catch(() => false);
    if (ok) break;
  }
  // contain: paint 让手机圆角真正裁住里面的内容（否则底部页签的一角会探出圆角，截图里左下角有一小块白）
  await evaluate(`document.getElementById('phone').style.contain = 'paint'; document.querySelector('.pv-panel').style.display = 'none'; document.querySelector('.pv-stage').style.padding = '0'; document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent'; true`);
  await sleep(600);
}
const page = () => `getCurrentPages().slice(-1)[0]`;
/** 在页面里执行一段脚本（可以调页面方法），然后等一下让界面刷新 */
async function run(code, wait = 400) {
  await evaluate(`(async () => { ${code} })()`);
  await sleep(wait);
}
async function shot(name) {
  const rect = await evaluate(`(() => { const r = document.getElementById('phone').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
  // 只截屏幕本身（手机元素自己的像素，不含网页里的边框阴影），外框在下面自己合成
  const clip = { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 };
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false, fromSurface: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name + '.png'), phoneFrame(data, rect.w, rect.h));
  console.log('  ✓', name);
}

/**
 * 把屏幕截图合成到手机外框里：屏幕按圆角裁切（盖掉截图角上多出来的杂色），四周一圈黑边，背景透明。
 * 用 SVG + resvg 合成，不依赖网页里的 box-shadow 画法。w / h 是屏幕的 CSS 像素尺寸。
 */
function phoneFrame(pngBase64, w, h) {
  const m = 12; // 外框宽度（CSS 像素）
  const r = 46; // 屏幕圆角
  const s = SCALE;
  const W = (w + m * 2) * s;
  const H = (h + m * 2) * s;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><clipPath id="screen"><rect x="${m * s}" y="${m * s}" width="${w * s}" height="${h * s}" rx="${r * s}"/></clipPath></defs>
    <rect x="0" y="0" width="${W}" height="${H}" rx="${(r + m) * s}" fill="#2A322D"/>
    <rect x="${s}" y="${s}" width="${W - 2 * s}" height="${H - 2 * s}" rx="${(r + m - 1) * s}" fill="#060807"/>
    <image x="${m * s}" y="${m * s}" width="${w * s}" height="${h * s}" clip-path="url(#screen)" xlink:href="data:image/png;base64,${pngBase64}"/>
  </svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
/** 海报页里渲染出来的整张海报（canvas 导出的 blob 图），原样存成 PNG：页面里的海报要滚动才看得全 */
async function savePoster(name) {
  const b64 = await evaluate(`(async () => {
    const img = document.querySelector('.wx-page img');
    const blob = await (await fetch(img.src)).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
  })()`);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(b64, 'base64'));
  console.log('  ✓', name, '(整张海报)');
}
const reset = async (seed) => { await open(`?device=0&seed=${seed}`); };
const scrollTo = (sel) => run(`const el = document.querySelector('.wx-page ${sel}'); if (el) el.scrollIntoView({ block: 'center' });`, 500);
/** 把 sel 对应的元素滚到滚动区顶部下面一点（不让它被页头圆角压住一半） */
const scrollToTop = (sel, gap = 16) => run(`const sv = document.querySelector('.wx-page .wx-scroll-view'); const el = document.querySelector('.wx-page ${sel}'); if (sv && el) sv.scrollTop += el.getBoundingClientRect().top - sv.getBoundingClientRect().top - ${gap};`, 500);
const scrollTop = () => run(`document.querySelectorAll('.wx-page, .wx-page .wx-scroll-view').forEach((e) => (e.scrollTop = 0));`, 300);

console.log('截图 →', out);
try {
  // 1 今日：选了「胸」（肌肉图标 + 休息天数，动作卡上的 ↻ 一键照上次）
  await reset('demo');
  await run(`const p = ${page()}; if (p.data.vm.mode === 'done') p.onUndo(); for (const c of p.data.vm.chips.filter((c) => c.on)) p.onTogglePart({ currentTarget: { dataset: { pid: c.id } }, detail: {} }); p.onTogglePart({ currentTarget: { dataset: { pid: 'chest' } }, detail: {} });`, 700);
  await shot('01-today-pick');

  // 2 今日：训练中（↻ 照上次一键排好 → 改重量打勾 → 新纪录奖杯 + 休息条）
  await run(`const p = ${page()};
    const bench = () => p.data.vm.sections.find((s) => s.pid === 'chest').items.find((x) => x.exId === 'bench-press');
    while (bench().count) p.onDecSet({ currentTarget: { dataset: { exid: 'bench-press' } }, detail: {} });
    p.onRepeatLast({ currentTarget: { dataset: { exid: 'bench-press' } }, detail: {} });
    p.onSetW({ currentTarget: { dataset: { exid: 'bench-press', idx: 0 } }, detail: { value: '60' } });
    p.onToggleSetDone({ currentTarget: { dataset: { exid: 'bench-press', idx: 0 } }, detail: {} });`, 900);
  await scrollToTop('.ex');
  await shot('02-today-training');

  // 3 专注模式
  await run(`${page()}.onFocus({ currentTarget: { dataset: { exid: 'bench-press' } }, detail: {} });`, 1000);
  await shot('03-focus');

  // 4 日历
  await reset('demo');
  await run(`wx.switchTab({ url: '/pages/calendar/calendar' });`, 900);
  await shot('04-calendar');

  // 5 饮食
  await run(`wx.switchTab({ url: '/pages/food/food' });`, 700);
  await run(`const p = ${page()}; p.onMeat({ currentTarget: { dataset: { id: 'chicken-breast' } }, detail: {} }); p.onMethod({ currentTarget: { dataset: { id: 'pan' } }, detail: {} });`, 500);
  await shot('05-food');

  // 6 推荐（练后餐卡片）
  await run(`wx.switchTab({ url: '/pages/rec/rec' });`, 1200);
  await shot('06-rec');

  // 7 我的：热力图 + 本周肌群人体图
  await run(`wx.switchTab({ url: '/pages/me/me' });`, 900);
  await scrollTop();
  await shot('07-me-top');
  await scrollTo('.body-map');
  await shot('08-me-muscles');
  await scrollTo('.badge-entry');
  await shot('09-me-badges');

  // 8 邮票版打卡海报
  await reset('done');
  await run(`wx.navigateTo({ url: '/pkg-share/pages/poster/poster?type=checkin' });`, 2500);
  await savePoster('10-poster-stamp');

  // 9 徽章墙、训练人格
  await run(`wx.redirectTo({ url: '/pkg-share/pages/badges/badges' });`, 1200);
  await shot('11-badges');
  await run(`wx.redirectTo({ url: '/pkg-share/pages/persona/persona' });`, 1200);
  await shot('12-persona');

  // 10 新手引导
  await reset('fresh');
  await run(`const n = getCurrentPages().length; if (n < 2) wx.navigateTo({ url: '/pkg-onboard/pages/onboarding/onboarding' });`, 1200);
  await shot('13-onboarding');
  await run(`const p = ${page()}; p.onNext(); p.onNext(); p.onNext();`, 700);
  await shot('14-onboarding-plan');
} finally {
  ws.close();
  proc.kill();
  await sleep(1500); // 等浏览器退出，临时用户目录才删得掉；删不掉也不影响截图
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch (e) { /* 系统临时目录，之后会被清掉 */ }
}
