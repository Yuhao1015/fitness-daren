import { describe, expect, it } from 'vitest';
import { RECIPES, type Recipe } from '../../miniprogram/core/recipes';
import { basisLabel, inSeason, mealTarget, rankRecipes } from '../../miniprogram/core/recommend';

const ctx = { favorites: [] as string[], recentRecipeIds: [] as string[], today: '2026-10-10' };

describe('recommend', () => {
  it('derives targets from bodyweight, parts and goal', () => {
    expect(mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['leg'])).toEqual({ p: 25, c: 70, kcalMax: 650, big: true, trained: true });
    expect(mealTarget({ bodyweightKg: null, goal: 'cut' }, ['chest'])).toEqual({ p: 23, c: 27, kcalMax: 550, big: false, trained: true });
    expect(mealTarget({ bodyweightKg: 150, goal: 'bulk' }, [])).toMatchObject({ p: 45, c: 75, kcalMax: 800, trained: false });
  });
  it('keeps the prototype basis labels', () => {
    expect(basisLabel(mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['back']))).toBe('大肌群训练日 · 优先补碳水 · 练后 1 小时内吃');
    expect(basisLabel(mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['arm']))).toBe('优先补蛋白 · 练后 1 小时内吃');
    expect(basisLabel(mealTarget({ bodyweightKg: 70, goal: 'maintain' }, []))).toBe('今天还没训练 · 通用搭配');
  });
  it('ranks a leg day (70 kg) and explains the top pick', () => {
    const ranked = rankRecipes(RECIPES, mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['leg']), ctx);
    expect(ranked[0].recipe.id).toBe('yogurt-oat-cup');
    expect(ranked[ranked.length - 1].recipe.id).toBe('chicken-quinoa-bowl');
    expect(ranked[0].reason).toBe('蛋白质 24g（建议 25g）· 碳水 56g（建议 70g）');
  });
  it('boosts favorites and penalizes recent meals', () => {
    const t = mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['leg']);
    // 无收藏时三文鱼排第 5（0.79）；收藏 +0.1 后升到第 2（0.89）
    const plain = rankRecipes(RECIPES, t, ctx);
    expect(plain.findIndex((x) => x.recipe.id === 'salmon-sweet-potato')).toBe(4);
    const fav = rankRecipes(RECIPES, t, { ...ctx, favorites: ['salmon-sweet-potato'] });
    expect(fav.findIndex((x) => x.recipe.id === 'salmon-sweet-potato')).toBe(1);
    expect(fav[1].reason).toContain('你收藏过');
    const recent = rankRecipes(RECIPES, t, { ...ctx, recentRecipeIds: ['yogurt-oat-cup'] });
    expect(recent[0].recipe.id).not.toBe('yogurt-oat-cup');
  });
  it('filters seasonal recipes, including ranges across new year', () => {
    const autumn: Recipe = { ...RECIPES[0], id: 'pumpkin', season: { from: '09-16', to: '09-30' } };
    const winter: Recipe = { ...RECIPES[0], id: 'winter', season: { from: '12-20', to: '01-10' } };
    expect(inSeason(autumn, '2026-10-10')).toBe(false);
    expect(inSeason(autumn, '2026-09-23')).toBe(true);
    expect(inSeason(winter, '2027-01-05')).toBe(true);
    expect(rankRecipes([autumn, ...RECIPES], mealTarget({ bodyweightKg: 70, goal: 'maintain' }, ['leg']), ctx).some((x) => x.recipe.id === 'pumpkin')).toBe(false);
  });
});
