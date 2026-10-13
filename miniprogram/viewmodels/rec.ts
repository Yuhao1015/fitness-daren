import { partById, type PartId } from '../core/catalog';
import type { DayKey } from '../core/date';
import { basisLabel, mealTarget, rankRecipes, type Ranked } from '../core/recommend';
import { RECIPES, ingredientChips, macroSplit } from '../core/recipes';
import type { DayRecord, Profile } from '../core/types';
import { INFO_TEXT, info, type InfoVM } from './common';

export interface RecInput {
  today: DayKey;
  parts: PartId[];
  burn: number;
  profile: Profile;
  favorites: string[];
  recentRecipeIds: string[];
  addedRecipeIds: string[];
  collectedIds: string[];
  index: number;
  infoOpen: string | null;
}

export interface CardVM {
  key: string; recipeId: string; name: string; kcal: number; p: number; c: number; f: number; tint: string;
  pp: number; cp: number; fp: number; splitText: string; chips: string[]; added: boolean; reason: string; hot: boolean; fav: boolean;
  steps: string[]; collected: boolean;
}

export interface RecVM {
  header: { over: string; title: string; num: string; numLabel: string };
  basis: string;
  card: CardVM;
  next: CardVM;
  back2Tint: string;
  counter: string;
  info: { swipe: InfoVM };
}

function cardOf(r: Ranked, i: RecInput): CardVM {
  const s = macroSplit(r.macros);
  return {
    key: r.recipe.id, recipeId: r.recipe.id, name: r.recipe.name, kcal: r.macros.kcal, p: r.macros.p, c: r.macros.c, f: r.macros.f,
    tint: r.recipe.tint, pp: s.pp, cp: s.cp, fp: s.fp, splitText: `蛋白质 ${s.pp}% · 碳水 ${s.cp}% · 脂肪 ${s.fp}%`,
    chips: ingredientChips(r.recipe), added: i.addedRecipeIds.includes(r.recipe.id), reason: r.reason, hot: r.recipe.hot,
    fav: i.favorites.includes(r.recipe.id), steps: r.recipe.steps, collected: i.collectedIds.includes(r.recipe.id),
  };
}

export function recentRecipeIds(days: DayRecord[]): string[] {
  const out = new Set<string>();
  for (const d of days) for (const f of d.food) if (f.recipeId) out.add(f.recipeId);
  return Array.from(out);
}

export function buildRecVM(i: RecInput): RecVM {
  const target = mealTarget(i.profile, i.parts);
  const ranked = rankRecipes(RECIPES, target, { favorites: i.favorites, recentRecipeIds: i.recentRecipeIds, today: i.today });
  const n = ranked.length;
  const idx = ((i.index % n) + n) % n;
  return {
    header: { over: '根据今日训练', title: i.parts.length ? i.parts.map((p) => partById(p).name).join(' + ') : '今日未训练', num: String(i.burn), numLabel: '今日消耗 kcal' },
    basis: basisLabel(target),
    card: cardOf(ranked[idx], i),
    next: cardOf(ranked[(idx + 1) % n], i),
    back2Tint: ranked[(idx + 2) % n].recipe.tint,
    counter: `${idx + 1} / ${n}`,
    info: { swipe: info(i.infoOpen, 'swipe', INFO_TEXT.swipe) },
  };
}
