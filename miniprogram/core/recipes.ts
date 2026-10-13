import { ingredientById } from './ingredients';
import type { FoodDraft } from './types';

export type Family = 'bowl' | 'plate' | 'cup' | 'box';
export type SlotName =
  | 'base' | 'side-left' | 'protein' | 'side' | 'topping' | 'rim'
  | 'carb' | 'garnish'
  | 'layer-bottom' | 'layer-mid' | 'layer-top'
  | 'left' | 'top-right' | 'bottom-right';

export interface Recipe {
  id: string;
  name: string;
  family: Family;
  /** 卡片上半区的底色（原型 MEALS[].tint） */
  tint: string;
  /** 热食显示热气 */
  hot: boolean;
  /** 槽位 → 插画图层的食材名（见 spec §8.2） */
  slots: Partial<Record<SlotName, string>>;
  ingredients: { id: string; g: number; label?: string }[];
  steps: string[];
  /** 节气限定：MM-DD 闭区间，可跨年 */
  season?: { from: string; to: string };
}

export const RECIPES: Recipe[] = [
  {
    id: 'chicken-quinoa-bowl', name: '鸡胸肉藜麦饭', family: 'bowl', tint: '#CFE8CB', hot: true,
    slots: { base: 'quinoa', protein: 'chicken', side: 'broccoli', topping: 'soft-egg', rim: 'green' },
    ingredients: [
      { id: 'chicken-breast', g: 150 },
      { id: 'quinoa-dry', g: 60, label: '藜麦 60g（干）' },
      { id: 'broccoli', g: 100 },
      { id: 'egg', g: 50, label: '溏心蛋 1 个' },
    ],
    steps: ['藜麦洗净，加 1.5 倍水小火煮 15 分钟', '鸡胸肉冷水下锅煮 12 分钟，切片；鸡蛋沸水煮 6 分钟得溏心蛋', '西兰花焯水 1 分钟，和鸡胸、溏心蛋一起铺在藜麦上'],
  },
  {
    id: 'salmon-sweet-potato', name: '香煎三文鱼配烤红薯', family: 'plate', tint: '#F9DCC8', hot: true,
    slots: { carb: 'sweet-potato-wedge', protein: 'salmon', side: 'asparagus', garnish: 'lemon' },
    ingredients: [
      { id: 'salmon', g: 120 },
      { id: 'sweet-potato', g: 150, label: '烤红薯 150g' },
      { id: 'asparagus', g: 80 },
      { id: 'olive-oil', g: 5, label: '橄榄油 5g' },
      { id: 'lemon', g: 10, label: '柠檬 1 片' },
    ],
    steps: ['红薯切块，200℃ 烤 25 分钟', '三文鱼抹少许盐，平底锅刷油，中火每面煎 3 分钟', '芦笋焯水后同盘，挤上柠檬汁'],
  },
  {
    id: 'beef-brown-rice-bowl', name: '牛肉糙米能量碗', family: 'bowl', tint: '#F2E6BF', hot: true,
    slots: { base: 'brown-rice', 'side-left': 'spinach', protein: 'beef', side: 'corn', rim: 'tan' },
    ingredients: [
      { id: 'beef-lean', g: 130 },
      { id: 'brown-rice-cooked', g: 150 },
      { id: 'spinach', g: 80 },
      { id: 'corn-kernels', g: 50 },
    ],
    steps: ['糙米提前浸泡 2 小时，按 1:1.5 加水煮饭', '牛肉切片，少油快炒 2 分钟至变色', '菠菜焯水，与玉米粒一起铺在饭上'],
  },
  {
    id: 'shrimp-pasta', name: '虾仁全麦意面', family: 'plate', tint: '#D6E4F4', hot: true,
    slots: { base: 'pasta', protein: 'shrimp', side: 'cherry-tomato', garnish: 'basil' },
    ingredients: [
      { id: 'shrimp', g: 150 },
      { id: 'ww-pasta-dry', g: 80, label: '全麦意面 80g（干）' },
      { id: 'cherry-tomato', g: 80 },
      { id: 'olive-oil', g: 5, label: '橄榄油 5g' },
      { id: 'basil', g: 2, label: '罗勒 少许' },
    ],
    steps: ['全麦意面按包装时间煮熟', '虾仁用少许橄榄油炒至变红', '加入小番茄翻炒 1 分钟，拌入意面，撒罗勒'],
  },
  {
    id: 'yogurt-oat-cup', name: '希腊酸奶燕麦杯', family: 'cup', tint: '#E5D9F0', hot: false,
    slots: { 'layer-bottom': 'yogurt-berry', 'layer-mid': 'oats', 'layer-top': 'yogurt', topping: 'blueberry-banana' },
    ingredients: [
      { id: 'greek-yogurt', g: 200 },
      { id: 'oats-dry', g: 40 },
      { id: 'blueberry', g: 50 },
      { id: 'banana', g: 60, label: '半根香蕉' },
    ],
    steps: ['杯底铺一半希腊酸奶', '中间铺一层燕麦片', '铺上剩下的酸奶，放蓝莓和香蕉片'],
  },
  {
    id: 'egg-sweet-potato-box', name: '鸡蛋红薯餐盒', family: 'box', tint: '#D4ECD0', hot: true,
    slots: { left: 'fried-egg', 'top-right': 'sweet-potato-cube', 'bottom-right': 'cucumber' },
    ingredients: [
      { id: 'egg', g: 150, label: '鸡蛋 3 个' },
      { id: 'sweet-potato', g: 200, label: '蒸红薯 200g' },
      { id: 'cucumber', g: 100, label: '黄瓜条 100g' },
    ],
    steps: ['红薯蒸 20 分钟后切块', '鸡蛋煎成荷包蛋或煮熟', '黄瓜切条，三格分装'],
  },
];

export function recipeById(id: string): Recipe {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error('unknown recipe ' + id);
  return r;
}

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

/** 先保留 1 位小数再取整，避免 13.4999… 这类浮点误差 */
function round0(x: number): number {
  return Math.round(Math.round(x * 10) / 10);
}

export function recipeMacros(r: Recipe): Macros {
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const { id, g } of r.ingredients) {
    const i = ingredientById(id);
    if (!i) throw new Error('unknown ingredient ' + id);
    const k = g / 100;
    kcal += i.kcal * k;
    p += i.p * k;
    c += i.c * k;
    f += i.f * k;
  }
  return { kcal: round0(kcal), p: round0(p), c: round0(c), f: round0(f) };
}

/** 热量来源占比（原型 1545–1546 行公式） */
export function macroSplit(m: Macros): { pp: number; cp: number; fp: number } {
  const total = m.p * 4 + m.c * 4 + m.f * 9;
  if (total <= 0) return { pp: 0, cp: 0, fp: 0 };
  const pp = Math.round(((m.p * 4) / total) * 100);
  const cp = Math.round(((m.c * 4) / total) * 100);
  return { pp, cp, fp: 100 - pp - cp };
}

export function ingredientChips(r: Recipe): string[] {
  return r.ingredients.map(({ id, g, label }) => label ?? `${ingredientById(id)!.name} ${g}g`);
}

export function recipeDraft(r: Recipe): FoodDraft {
  const m = recipeMacros(r);
  return { title: r.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, src: 'recipe', recipeId: r.id };
}
