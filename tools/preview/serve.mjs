// 预览服务：每次打开首页时重新打包，改完代码刷新浏览器即可。
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
const port = Number(process.env.PORT) || 5174;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.map': 'application/json' };

let mock = null;
async function mockCloud() {
  if (!mock) mock = await import('./mock-cloud.mjs');
  return mock;
}
function readJson(req) {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(s || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}
const send = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

await build();
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (req.method === 'POST' && p.startsWith('/__cloud/')) {
    try {
      const m = await mockCloud();
      const body = await readJson(req);
      if (p === '/__cloud/call') return send(res, 200, await m.call(m.ME, body));
      if (p === '/__cloud/seed') return send(res, 200, await m.seed(String(body.today)));
      if (p === '/__cloud/reset') {
        m.reset();
        return send(res, 200, { ok: true });
      }
    } catch (e) {
      console.error('[mock-cloud]', e);
      return send(res, 500, { ok: false, code: 'MOCK_FAILED', message: String(e && e.message) });
    }
    return send(res, 404, { ok: false, code: 'UNKNOWN' });
  }
  if (p === '/' || p === '/index.html') {
    try {
      await build();
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('build failed\n' + e.message);
      return;
    }
    p = '/index.html';
  }
  const file = path.join(dist, p);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`preview: http://localhost:${port}/`);
  const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal);
  for (const i of lan) console.log(`手机（同一 Wi-Fi）打开: http://${i.address}:${port}/`);
});
