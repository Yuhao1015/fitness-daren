import { describe, expect, it } from 'vitest';
import { RECIPES, ingredientChips, macroSplit, recipeById, recipeMacros } from '../../miniprogram/core/recipes';
import { ingredientById } from '../../miniprogram/core/ingredients';

describe('recipes', () => {
  it('computes macros from ingredients instead of hand-typed numbers', () => {
    expect(recipeMacros(recipeById('chicken-quinoa-bowl'))).toEqual({ kcal: 504, p: 54, c: 47, f: 11 });
    expect(recipeMacros(recipeById('salmon-sweet-potato'))).toEqual({ kcal: 442, p: 28, c: 34, f: 21 });
    expect(recipeMacros(recipeById('beef-brown-rice-bowl'))).toEqual({ kcal: 408, p: 35, c: 51, f: 8 });
    expect(recipeMacros(recipeById('shrimp-pasta'))).toEqual({ kcal: 471, p: 38, c: 63, f: 8 });
    expect(recipeMacros(recipeById('yogurt-oat-cup'))).toEqual({ kcal: 428, p: 24, c: 56, f: 13 });
    expect(recipeMacros(recipeById('egg-sweet-potato-box'))).toEqual({ kcal: 403, p: 24, c: 48, f: 14 });
  });
  it('splits energy sources like the prototype', () => {
    // 48×4=192、52×4=208、12×9=108，总 508 → 37.8→38、40.9→41、余 21
    const s = macroSplit({ kcal: 0, p: 48, c: 52, f: 12 });
    expect(s.pp + s.cp + s.fp).toBe(100);
    expect(s).toEqual({ pp: 38, cp: 41, fp: 21 });
  });
  it('renders ingredient chips with custom labels', () => {
    expect(ingredientChips(recipeById('chicken-quinoa-bowl'))).toEqual(['鸡胸肉 150g', '藜麦 60g（干）', '西兰花 100g', '溏心蛋 1 个']);
  });
  it('references only known ingredients and keeps ids unique', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RECIPES) for (const i of r.ingredients) expect(ingredientById(i.id)).toBeDefined();
    for (const r of RECIPES) expect(r.steps.length).toBe(3);
  });
});
