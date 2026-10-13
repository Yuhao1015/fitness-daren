import type { PartId } from './catalog';
import type { DayKey } from './date';
import { recipeMacros, type Macros, type Recipe } from './recipes';
import type { Goal } from './types';

export interface MealTarget {
  p: number;
  c: number;
  kcalMax: number;
  big: boolean;
  trained: boolean;
}

const KCAL_MAX: Record<Goal, number> = { cut: 550, maintain: 650, bulk: 800 };

export function mealTarget(profile: { bodyweightKg: number | null; goal: Goal }, parts: PartId[]): MealTarget {
  const bw = profile.bodyweightKg && profile.bodyweightKg > 0 ? profile.bodyweightKg : 65;
  const trained = parts.length > 0;
  const big = parts.some((p) => p === 'leg' || p === 'back' || p === 'cardio');
  const p = Math.min(45, Math.max(20, Math.round((bw * 35) / 100)));
  const k = !trained ? 0.5 : big ? 1.0 : 0.6;
  const c = Math.round(bw * k * (profile.goal === 'cut' ? 0.7 : 1));
  return { p, c, kcalMax: KCAL_MAX[profile.goal], big, trained };
}

export function basisLabel(t: MealTarget): string {
  if (!t.trained) return '今天还没训练 · 通用搭配';
  return (t.big ? '大肌群训练日 · 优先补碳水' : '优先补蛋白') + ' · 练后 1 小时内吃';
}

export function inSeason(r: Recipe, today: DayKey): boolean {
  if (!r.season) return true;
  const md = today.slice(5);
  const { from, to } = r.season;
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

export interface Ranked {
  recipe: Recipe;
  macros: Macros;
  score: number;
  reason: string;
}

export function rankRecipes(
  recipes: Recipe[],
  t: MealTarget,
  ctx: { favorites: string[]; recentRecipeIds: string[]; today: DayKey },
): Ranked[] {
  const scored = recipes
    .filter((r) => inSeason(r, ctx.today))
    .map((recipe, index) => {
      const m = recipeMacros(recipe);
      // 蛋白质不足全额扣分、超出只扣一半
      const pDev = m.p < t.p ? (t.p - m.p) / t.p : ((m.p - t.p) / t.p) * 0.5;
      const cDev = Math.abs(m.c - t.c) / t.c;
      const over = m.kcal > t.kcalMax ? Math.min(1, (m.kcal - t.kcalMax) / t.kcalMax) * 0.15 : 0;
      const fav = ctx.favorites.includes(recipe.id);
      const recent = ctx.recentRecipeIds.includes(recipe.id);
      const score = 1 - 0.5 * Math.min(1, pDev) - 0.35 * Math.min(1, cDev) - over + (fav ? 0.1 : 0) - (recent ? 0.2 : 0);
      let reason = `蛋白质 ${m.p}g（建议 ${t.p}g）· 碳水 ${m.c}g（建议 ${t.c}g）`;
      if (fav) reason += ' · 你收藏过';
      if (over > 0) reason += ' · 热量偏高';
      return { recipe, macros: m, score, reason, index };
    });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(({ recipe, macros, score, reason }) => ({ recipe, macros, score, reason }));
}
