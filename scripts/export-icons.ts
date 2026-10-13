import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { BADGES } from '../miniprogram/core/badges';
import { PART_IDS } from '../miniprogram/core/catalog';
import { iconSvg } from '../miniprogram/core/icons';

const out = path.join(process.cwd(), 'miniprogram/assets/icons');
fs.mkdirSync(out, { recursive: true });

function save(name: string, svg: string, size: number): void {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(out, name + '.png'), png);
}

const white = new Set<string>([...PART_IDS.map((p) => 'part-' + p), ...BADGES.map((b) => b.icon)]);
for (const name of white) save(`${name}-white`, iconSvg(name, '#FFFFFF'), 96);
save('trophy-warn', iconSvg('trophy', '#8A4513'), 48);
console.log(`exported ${white.size + 1} poster icons to miniprogram/assets/icons`);
