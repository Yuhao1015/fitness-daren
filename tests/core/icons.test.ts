import { describe, expect, it } from 'vitest';
import { ICONS, iconSvg, iconUri, liftIcon } from '../../miniprogram/core/icons';
import { PART_IDS, PROGRESS_LIFTS } from '../../miniprogram/core/catalog';

const decode = (uri: string) => Buffer.from(uri.split(',')[1], 'base64').toString('utf8');

describe('icons', () => {
  it('colors stroke and currentColor fills', () => {
    const svg = iconSvg('info', '#1F5C38');
    expect(svg).toContain('stroke="#1F5C38"');
    expect(svg).toContain('fill="#1F5C38"');
    expect(svg).not.toContain('currentColor');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
  it('produces a decodable data uri', () => {
    expect(decode(iconUri('check', '#FFFFFF'))).toBe(iconSvg('check', '#FFFFFF'));
  });
  it('has an icon for every part, tab and progress lift', () => {
    for (const p of PART_IDS) expect(ICONS['part-' + p]).toBeDefined();
    for (const t of ['tab-today', 'tab-cal', 'tab-food', 'tab-rec', 'tab-me']) expect(ICONS[t]).toBeDefined();
    for (const id of PROGRESS_LIFTS) expect(ICONS[liftIcon(id)]).toBeDefined();
    expect(ICONS['part-leg'].vb).toBe(32);
  });
  it('throws on unknown names', () => {
    expect(() => iconUri('nope', '#000')).toThrow();
  });
});
