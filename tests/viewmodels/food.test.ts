import { describe, expect, it } from 'vitest';
import { emptyDay } from '../../miniprogram/core/types';
import { addFood } from '../../miniprogram/core/day-ops';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { DEFAULT_FOOD_UI, buildFoodVM } from '../../miniprogram/viewmodels/food';

const T = '2026-10-10';
const item = (id: string, title: string, kcal: number, p: number, at: number) => ({ id, title, kcal, p, c: 0, f: 0, src: 'calc' as const, at });

describe('buildFoodVM', () => {
  it('reproduces the prototype calculator defaults', () => {
    const vm = buildFoodVM({ today: T, day: emptyDay(T), recentDesc: [], burn: 120, profile: DEFAULT_PROFILE, ui: DEFAULT_FOOD_UI });
    expect(vm.header).toEqual({ over: '饮食记录 · 10月10日 · 周六', title: '今日饮食', num: '0', numLabel: '已摄入 kcal' });
    expect(vm.item).toEqual({ title: '煎鸡胸肉 · 150 g', kcal: 245, p: 36 });
    expect(vm.methods.find((m) => m.id === 'pan')!.sub).toBe('+68');
    expect(vm.methods.find((m) => m.id === 'boil')!.sub).toBe('');
    expect(vm.methods.find((m) => m.id === 'pan')!.icon).toBe('cook-pan');
    expect(vm.meats[0].icon).toBe('ing-chicken-breast');
    expect(vm.meats[0].sub).toBe('118');
    expect(vm.methods.find((m) => m.id === 'fry')!.subFg).toBe('#9A3B12');
    expect(vm.balance).toBe('训练消耗 120 kcal');
    expect(vm.empty).toBe(true);
    expect(vm.protein.show).toBe(false);
  });

  it('previews quick carbs with portion multipliers', () => {
    const vm = buildFoodVM({ today: T, day: emptyDay(T), recentDesc: [], burn: 0, profile: DEFAULT_PROFILE, ui: { ...DEFAULT_FOOD_UI, quickMult: 0.5 } });
    expect(vm.quick.mults.map((m) => m.label)).toEqual(['½', '1', '2']);
    expect(vm.quick.items[0].icon).toBe('ing-rice-cooked');
    expect(vm.quick.tabs.map((t) => t.icon)).toEqual(['ing-rice-cooked', 'ing-broccoli']);
    expect(vm.quick.preview).toBe('米饭 · 半碗（75g） · 87 kcal');
    const produce = buildFoodVM({ today: T, day: emptyDay(T), recentDesc: [], burn: 0, profile: DEFAULT_PROFILE, ui: { ...DEFAULT_FOOD_UI, quickTab: 'produce', quickId: 'banana', quickMult: 1 } });
    expect(produce.quick.items.map((x) => x.id)).toContain('banana');
    expect(produce.quick.preview).toBe('香蕉 · 一根（100g） · 89 kcal');
  });

  it('shows the protein bar only when bodyweight is known', () => {
    const day = addFood(emptyDay(T), item('a', '煎鸡胸肉 · 150 g', 245, 36, 1));
    const vm = buildFoodVM({ today: T, day, recentDesc: [day], burn: 0, profile: { ...DEFAULT_PROFILE, bodyweightKg: 70 }, ui: DEFAULT_FOOD_UI });
    expect(vm.protein).toEqual({ show: true, text: '蛋白质 36 / 112 g', pct: 32 });
    expect(vm.header.num).toBe('245');
    expect(vm.list).toEqual([{ key: 'a', id: 'a', title: '煎鸡胸肉 · 150 g', kcal: 245, p: 36 }]);
    expect(vm.frequent.map((f) => f.title)).toEqual(['煎鸡胸肉 · 150 g']);
  });
});
