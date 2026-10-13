import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { RECIPES, recipeById } from '../../miniprogram/core/recipes';
import { SPRITES } from '../../miniprogram/core/dish-sprites';
import { composeDish } from '../../miniprogram/core/dish';

const manifest = JSON.parse(fs.readFileSync('art/sprites/manifest.json', 'utf8'));

describe('dish composition', () => {
  it('keeps the TS sprite list identical to the manifest', () => {
    expect([...SPRITES].sort()).toEqual(Object.keys(manifest.sprites).sort());
  });
  it('stacks a bowl exactly like the prototype', () => {
    expect(composeDish(recipeById('chicken-quinoa-bowl')).map((l) => l.sprite)).toEqual([
      'bowl.back', 'bowl.base.quinoa', 'bowl.protein.chicken', 'bowl.side.broccoli', 'bowl.topping.soft-egg', 'bowl.front', 'bowl.rim.green',
    ]);
  });
  it('has no front layer for plates', () => {
    expect(composeDish(recipeById('salmon-sweet-potato')).map((l) => l.sprite)).toEqual([
      'plate.back', 'plate.side.asparagus', 'plate.carb.sweet-potato-wedge', 'plate.protein.salmon', 'plate.garnish.lemon',
    ]);
  });
  it('resolves every slot of every recipe to an existing sprite', () => {
    for (const r of RECIPES) {
      const layers = composeDish(r);
      const used = Object.keys(r.slots).length;
      expect(layers.length, r.id).toBe(used + 1 + (r.family === 'plate' ? 0 : 1));
    }
  });
  it('skips unknown slot values instead of breaking', () => {
    const r = { ...recipeById('chicken-quinoa-bowl'), slots: { base: 'quinoa', protein: 'tofu' } };
    expect(composeDish(r).map((l) => l.sprite)).toEqual(['bowl.back', 'bowl.base.quinoa', 'bowl.front']);
  });
});
