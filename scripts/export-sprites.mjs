import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, process.argv[2] || 'miniprogram/assets/dish');
const width = Number(process.argv[3] || 480);
fs.mkdirSync(outDir, { recursive: true });

let bytes = 0;
for (const f of fs.readdirSync(path.join(root, 'art/sprites')).filter((x) => x.endsWith('.svg'))) {
  const svg = fs.readFileSync(path.join(root, 'art/sprites', f), 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  fs.writeFileSync(path.join(outDir, f.replace(/\.svg$/, '.png')), png);
  bytes += png.length;
}
console.log(`exported to ${path.relative(root, outDir)}, total ${(bytes / 1024).toFixed(0)} KB`);
