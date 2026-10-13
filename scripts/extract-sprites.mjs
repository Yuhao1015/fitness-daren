import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'art/sprites/manifest.json'), 'utf8'));
const src = fs.readFileSync(path.join(root, manifest.source), 'utf8').split(/\r?\n/);
const lines = (a, b) => src.slice(a - 1, b).join('\n');
const defs = lines(manifest.defs[0], manifest.defs[1]);

let n = 0;
for (const [name, spec] of Object.entries(manifest.sprites)) {
  let body = spec.ranges.map(([a, b]) => lines(a, b)).join('\n');
  if (spec.clip) body = `<g clip-path="url(#${spec.clip})">\n${body}\n</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150" viewBox="0 0 240 150">\n<defs>\n${defs}\n</defs>\n${body}\n</svg>\n`;
  fs.writeFileSync(path.join(root, 'art/sprites', `${name}.svg`), svg);
  n++;
}
console.log(`extracted ${n} sprites`);
