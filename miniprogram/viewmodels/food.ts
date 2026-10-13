import { mdText, weekdayText, type DayKey } from '../core/date';
import {
  CALC_MEATS, GRAM_PRESETS, METHODS, QUICK_CARBS, QUICK_PRODUCE, calcMeat, dayIntake, frequentFoods,
  methodDelta, portionDraft, type PortionMult,
} from '../core/food';
import { ingredientIcon, methodIcon } from '../core/icons-food';
import { ingredientById } from '../core/ingredients';
import type { DayRecord, Profile } from '../core/types';
import { C, INFO_TEXT, chip, info, type ChipVM, type InfoVM } from './common';

export interface FoodUI {
  meat: string;
  method: string;
  grams: number;
  quickTab: 'carb' | 'produce';
  quickId: string;
  quickMult: PortionMult;
  infoOpen: string | null;
}

export const DEFAULT_FOOD_UI: FoodUI = { meat: 'chicken-breast', method: 'pan', grams: 150, quickTab: 'carb', quickId: 'rice-cooked', quickMult: 1, infoOpen: null };

export interface FoodInput {
  today: DayKey;
  day: DayRecord;
  /** 最近 14 天（含今天），按日期倒序 */
  recentDesc: DayRecord[];
  burn: number;
  profile: Profile;
  ui: FoodUI;
}

type SubChip = ChipVM & { sub: string; subFg: string };

export interface FoodVM {
  header: { over: string; title: string; num: string; numLabel: string };
  protein: { show: boolean; text: string; pct: number };
  meats: SubChip[];
  methods: SubChip[];
  presets: ChipVM[];
  grams: number;
  item: { title: string; kcal: number; p: number };
  quick: { tabs: ChipVM[]; items: SubChip[]; mults: ChipVM[]; preview: string };
  frequent: { key: string; idx: number; title: string; kcal: number }[];
  balance: string;
  empty: boolean;
  list: { key: string; id: string; title: string; kcal: number; p: number }[];
  info: { grams: InfoVM };
}

export function quickList(tab: FoodUI['quickTab']): string[] {
  return tab === 'carb' ? QUICK_CARBS : QUICK_PRODUCE;
}

export function buildFoodVM(i: FoodInput): FoodVM {
  const { ui } = i;
  const intake = dayIntake(i.day);
  const bw = i.profile.bodyweightKg;
  const pTarget = bw ? Math.round(bw * 1.6) : 0;
  const item = calcMeat(ui.meat, ui.method, ui.grams);
  const list = quickList(ui.quickTab);
  const qId = list.includes(ui.quickId) ? ui.quickId : list[0];
  const draft = portionDraft(qId, ui.quickMult);
  return {
    header: { over: `饮食记录 · ${mdText(i.today)} · ${weekdayText(i.today)}`, title: '今日饮食', num: String(intake.kcal), numLabel: '已摄入 kcal' },
    protein: bw ? { show: true, text: `蛋白质 ${intake.p} / ${pTarget} g`, pct: Math.min(100, Math.round((intake.p / pTarget) * 100)) } : { show: false, text: '', pct: 0 },
    meats: CALC_MEATS.map((id) => {
      const m = ingredientById(id)!;
      return { ...chip(id, m.name, id === ui.meat, '', ingredientIcon(id)), sub: String(m.kcal), subFg: C.TEXT2 };
    }),
    methods: METHODS.map((m) => ({
      ...chip(m.id, m.name, m.id === ui.method, '', methodIcon(m.id)),
      sub: m.addKcal === 0 ? '' : `+${methodDelta(m.id, ui.grams)}`,
      subFg: m.addKcal >= 100 ? C.HOT : C.TEXT2,
    })),
    presets: GRAM_PRESETS.map((g) => chip(String(g), `${g}g`, g === ui.grams)),
    grams: ui.grams,
    item: { title: item.title, kcal: item.kcal, p: item.p },
    quick: {
      tabs: [chip('carb', '主食', ui.quickTab === 'carb', '', ingredientIcon('rice-cooked')), chip('produce', '蔬果', ui.quickTab === 'produce', '', ingredientIcon('broccoli'))],
      items: list.map((id) => {
        const g = ingredientById(id)!;
        return { ...chip(id, g.name, id === qId, '', ingredientIcon(id)), sub: '', subFg: C.TEXT2 };
      }),
      mults: ([0.5, 1, 2] as PortionMult[]).map((m) => chip(String(m), m === 0.5 ? '½' : String(m), m === ui.quickMult)),
      preview: `${draft.title} · ${draft.kcal} kcal`,
    },
    frequent: frequentFoods(i.recentDesc, 5).map((d, idx) => ({ key: 'q' + idx, idx, title: d.title, kcal: d.kcal })),
    balance: `训练消耗 ${i.burn} kcal`,
    empty: i.day.food.length === 0,
    list: i.day.food.map((f) => ({ key: f.id, id: f.id, title: f.title, kcal: f.kcal, p: f.p })),
    info: { grams: info(ui.infoOpen, 'grams', INFO_TEXT.grams) },
  };
}
