import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../miniprogram/services/store';
import { RECIPES, type Recipe } from '../../miniprogram/core/recipes';
import { collectDish, dishBookVM, loadDishBook, loadFavorites, toggleFavorite } from '../../miniprogram/core/collection';

describe('dish book', () => {
  it('collects once and counts', () => {
    const s = new MemoryStorage();
    expect(collectDish(s, 'shrimp-pasta', 5)).toEqual({ isNew: true, count: 1 });
    expect(collectDish(s, 'shrimp-pasta', 9)).toEqual({ isNew: false, count: 1 });
    expect(loadDishBook(s)).toEqual({ 'shrimp-pasta': 5 });
  });
  it('toggles favorites', () => {
    const s = new MemoryStorage();
    expect(toggleFavorite(s, 'a')).toBe(true);
    expect(toggleFavorite(s, 'b')).toBe(true);
    expect(toggleFavorite(s, 'a')).toBe(false);
    expect(loadFavorites(s)).toEqual(['b']);
  });
  it('hides out-of-season dishes unless collected', () => {
    const pumpkin: Recipe = { ...RECIPES[0], id: 'pumpkin', name: '南瓜鸡胸碗', season: { from: '09-16', to: '09-30' } };
    const vm = dishBookVM({ 'shrimp-pasta': new Date(2026, 9, 8, 12).getTime() }, [...RECIPES, pumpkin], '2026-10-10');
    expect(vm.total).toBe(6);
    expect(vm.count).toBe(1);
    expect(vm.items.find((x) => x.recipeId === 'shrimp-pasta')).toMatchObject({ collected: true, dateText: '10月8日收录' });
    expect(vm.items.some((x) => x.recipeId === 'pumpkin')).toBe(false);
    const withPumpkin = dishBookVM({ pumpkin: 1 }, [...RECIPES, pumpkin], '2026-10-10');
    expect(withPumpkin.total).toBe(7);
  });
});
