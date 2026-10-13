import { describe, expect, it } from 'vitest';
import { emptyDay } from '../../miniprogram/core/types';
import { addFood } from '../../miniprogram/core/day-ops';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { buildRecVM, recentRecipeIds } from '../../miniprogram/viewmodels/rec';

const base = { today: '2026-10-10', parts: ['leg' as const], burn: 300, profile: { ...DEFAULT_PROFILE, bodyweightKg: 70 }, favorites: [], recentRecipeIds: [], addedRecipeIds: [], collectedIds: [] as string[], index: 0, infoOpen: null };

describe('buildRecVM', () => {
  it('ranks for a leg day and shows the next card underneath', () => {
    const vm = buildRecVM(base);
    expect(vm.basis).toBe('大肌群训练日 · 优先补碳水 · 练后 1 小时内吃');
    expect(vm.card.recipeId).toBe('yogurt-oat-cup');
    expect(vm.card.hot).toBe(false);
    expect(vm.next.recipeId).toBe('egg-sweet-potato-box');
    expect(vm.counter).toBe('1 / 6');
    expect(vm.header).toEqual({ over: '根据今日训练', title: '腿', num: '300', numLabel: '今日消耗 kcal' });
    expect(vm.card.splitText).toBe(`蛋白质 ${vm.card.pp}% · 碳水 ${vm.card.cp}% · 脂肪 ${vm.card.fp}%`);
  });
  it('wraps the index in both directions', () => {
    expect(buildRecVM({ ...base, index: 6 }).counter).toBe('1 / 6');
    expect(buildRecVM({ ...base, index: -1 }).counter).toBe('6 / 6');
  });
  it('marks a card as added when it is already in today food', () => {
    expect(buildRecVM({ ...base, addedRecipeIds: ['yogurt-oat-cup'] }).card.added).toBe(true);
  });
  it('falls back to a general basis on rest days', () => {
    const vm = buildRecVM({ ...base, parts: [] });
    expect(vm.header.title).toBe('今日未训练');
    expect(vm.basis).toBe('今天还没训练 · 通用搭配');
  });
  it('collects recipe ids eaten in the given days', () => {
    const d = addFood(emptyDay('2026-10-09'), { id: 'x', title: '鸡胸肉藜麦饭', kcal: 504, p: 54, c: 47, f: 11, src: 'recipe', recipeId: 'chicken-quinoa-bowl', at: 1 });
    expect(recentRecipeIds([d, emptyDay('2026-10-08')])).toEqual(['chicken-quinoa-bowl']);
  });
});

describe('card back side', () => {
  it('exposes steps and collection state', () => {
    const vm = buildRecVM({ ...base, collectedIds: ['yogurt-oat-cup'] });
    expect(vm.card.steps).toHaveLength(3);
    expect(vm.card.collected).toBe(true);
    expect(vm.next.collected).toBe(false);
  });
});
