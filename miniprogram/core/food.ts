import { ingredientById } from './ingredients';
import type { DayRecord, FoodDraft } from './types';

/** 原型「1 · 选择肉类」的 6 种 */
export const CALC_MEATS = ['chicken-breast', 'chicken-thigh', 'beef-lean', 'pork-loin', 'salmon', 'shrimp'];

export interface CookMethod {
  id: string;
  name: string;
  /** 每 100g 肉额外增加的 kcal（来自用油） */
  addKcal: number;
}

export const METHODS: CookMethod[] = [
  { id: 'boil', name: '煮', addKcal: 0 },
  { id: 'steam', name: '蒸', addKcal: 0 },
  { id: 'roast', name: '烤', addKcal: 15 },
  { id: 'braise', name: '卤', addKcal: 25 },
  { id: 'pan', name: '煎', addKcal: 45 },
  { id: 'fry', name: '炸', addKcal: 120 },
];

export const GRAM_PRESETS = [100, 150, 200, 250];

function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error('unknown ' + what);
  return v;
}

export function calcMeat(meatId: string, methodId: string, grams: number): FoodDraft {
  const m = must(ingredientById(meatId), 'meat ' + meatId);
  const k = must(METHODS.find((x) => x.id === methodId), 'method ' + methodId);
  const r = grams / 100;
  return {
    title: `${k.name}${m.name} · ${grams} g`,
    kcal: Math.round(r * (m.kcal + k.addKcal)),
    p: Math.round(r * m.p),
    c: Math.round(r * m.c),
    f: Math.round(r * (m.f + k.addKcal / 9)),
    src: 'calc',
  };
}

export function methodDelta(methodId: string, grams: number): number {
  const k = must(METHODS.find((x) => x.id === methodId), 'method ' + methodId);
  return Math.round((grams / 100) * k.addKcal);
}

export type PortionMult = 0.5 | 1 | 2;

export function portionLabel(label: string, mult: PortionMult): string {
  const unit = label.slice(1);
  return (mult === 0.5 ? '半' : mult === 2 ? '两' : '一') + unit;
}

export function portionDraft(ingId: string, mult: PortionMult): FoodDraft {
  const i = must(ingredientById(ingId), 'ingredient ' + ingId);
  const g = Math.round(i.portion.g * mult);
  const r = g / 100;
  return {
    title: `${i.name} · ${portionLabel(i.portion.label, mult)}（${g}g）`,
    kcal: Math.round(r * i.kcal),
    p: Math.round(r * i.p),
    c: Math.round(r * i.c),
    f: Math.round(r * i.f),
    src: 'quick',
  };
}

export const QUICK_CARBS = ['rice-cooked', 'brown-rice-cooked', 'sweet-potato', 'oats-dry', 'ww-pasta-dry', 'ww-bread', 'corn-kernels'];
export const QUICK_PRODUCE = ['broccoli', 'spinach', 'cherry-tomato', 'cucumber', 'banana', 'blueberry'];

/** 最近记过的不同食物（按时间倒序），用于「常吃」一键再记 */
export function frequentFoods(daysDesc: DayRecord[], limit = 5): FoodDraft[] {
  const seen = new Set<string>();
  const out: FoodDraft[] = [];
  for (const d of daysDesc) {
    const items = d.food.slice().sort((a, b) => b.at - a.at);
    for (const it of items) {
      if (seen.has(it.title)) continue;
      seen.add(it.title);
      const { title, kcal, p, c, f, src, recipeId } = it;
      out.push(recipeId ? { title, kcal, p, c, f, src, recipeId } : { title, kcal, p, c, f, src });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function dayIntake(day: DayRecord): { kcal: number; p: number; c: number; f: number } {
  return day.food.reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}
