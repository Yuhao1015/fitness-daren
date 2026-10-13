import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../../miniprogram/core/ingredients';
import { calcMeat, dayIntake, frequentFoods, methodDelta, portionDraft } from '../../miniprogram/core/food';
import { emptyDay } from '../../miniprogram/core/types';
import { addFood } from '../../miniprogram/core/day-ops';

describe('food', () => {
  it('matches the prototype calculator (pan-fried chicken breast, 150 g)', () => {
    expect(calcMeat('chicken-breast', 'pan', 150)).toMatchObject({ title: '煎鸡胸肉 · 150 g', kcal: 245, p: 36, src: 'calc' });
    expect(methodDelta('pan', 150)).toBe(68);
    expect(methodDelta('boil', 150)).toBe(0);
  });
  it('builds portion drafts with readable labels', () => {
    expect(portionDraft('rice-cooked', 1)).toMatchObject({ title: '米饭 · 一碗（150g）', kcal: 174, c: 39 });
    expect(portionDraft('rice-cooked', 0.5).title).toBe('米饭 · 半碗（75g）');
    expect(portionDraft('banana', 2).title).toBe('香蕉 · 两根（200g）');
  });
  it('keeps every ingredient energy roughly consistent with its macros', () => {
    // 低热量食材（蔬菜、柠檬）的相对误差主要来自膳食纤维，没有意义，只查 ≥ 50 kcal 的
    for (const i of INGREDIENTS.filter((x) => x.kcal >= 50)) {
      const atwater = i.p * 4 + i.c * 4 + i.f * 9;
      expect(Math.abs(atwater - i.kcal) / i.kcal).toBeLessThan(0.25);
    }
  });
  it('lists distinct recent foods', () => {
    const mk = (id: string, title: string, at: number) => ({ id, title, kcal: 100, p: 10, c: 5, f: 2, src: 'quick' as const, at });
    const d2 = addFood(addFood(emptyDay('2026-10-10'), mk('a', '米饭 · 一碗（150g）', 3)), mk('b', '香蕉 · 一根（100g）', 4));
    const d1 = addFood(emptyDay('2026-10-09'), mk('c', '米饭 · 一碗（150g）', 1));
    const list = frequentFoods([d2, d1], 5);
    expect(list.map((x) => x.title)).toEqual(['香蕉 · 一根（100g）', '米饭 · 一碗（150g）']);
    expect(dayIntake(d2)).toEqual({ kcal: 200, p: 20, c: 10, f: 4 });
  });
});
