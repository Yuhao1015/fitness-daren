import { describe, expect, it } from 'vitest';
import { PARTS, TEMPLATES } from '../../miniprogram/core/catalog';
import { CALC_MEATS, METHODS, QUICK_CARBS, QUICK_PRODUCE } from '../../miniprogram/core/food';
import { ICONS, iconSvg } from '../../miniprogram/core/icons';
import { ingredientIcon, methodIcon } from '../../miniprogram/core/icons-food';
import { ingredientById } from '../../miniprogram/core/ingredients';

describe('icon-first UI needs an icon for everything it shows without text', () => {
  it('has an icon for every body part', () => {
    for (const p of PARTS) expect(ICONS['part-' + p.id], p.id).toBeDefined();
  });

  it('has an icon for every cooking method', () => {
    for (const m of METHODS) expect(ICONS[methodIcon(m.id)], m.id).toBeDefined();
  });

  it('has an icon for every meat, staple and produce item', () => {
    for (const id of [...CALC_MEATS, ...QUICK_CARBS, ...QUICK_PRODUCE]) {
      expect(ingredientById(id), id).toBeDefined();
      expect(ICONS[ingredientIcon(id)], id).toBeDefined();
    }
  });

  it('has the rest-day icon', () => {
    expect(ICONS.moon).toBeDefined();
  });

  it('renders every icon as a well-formed svg in a given color', () => {
    for (const name of Object.keys(ICONS)) {
      const svg = iconSvg(name, '#123456');
      expect(svg.startsWith('<svg'), name).toBe(true);
      expect(svg.includes('currentColor'), name).toBe(false);
    }
  });

  it('keeps template days drawable (every part has an icon)', () => {
    for (const t of TEMPLATES) for (const d of t.cycle) for (const p of d.parts) expect(ICONS['part-' + p], p).toBeDefined();
  });

});
