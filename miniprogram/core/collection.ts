import { mdText, toKey, type DayKey } from './date';
import { inSeason } from './recommend';
import type { Recipe } from './recipes';

export interface KV {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export type DishBook = Record<string, number>;

const BOOK = 'dishbook';
const FAV = 'favorites';

export function loadDishBook(s: KV): DishBook {
  return s.get<DishBook>(BOOK) ?? {};
}

export function collectDish(s: KV, recipeId: string, now: number): { isNew: boolean; count: number } {
  const book = loadDishBook(s);
  const isNew = !(recipeId in book);
  if (isNew) {
    book[recipeId] = now;
    s.set(BOOK, book);
  }
  return { isNew, count: Object.keys(book).length };
}

export function loadFavorites(s: KV): string[] {
  return s.get<string[]>(FAV) ?? [];
}

export function toggleFavorite(s: KV, recipeId: string): boolean {
  const fav = loadFavorites(s);
  const on = !fav.includes(recipeId);
  s.set(FAV, on ? [...fav, recipeId] : fav.filter((x) => x !== recipeId));
  return on;
}

export function dishBookVM(book: DishBook, recipes: Recipe[], today: DayKey) {
  const visible = recipes.filter((r) => inSeason(r, today) || r.id in book);
  const items = visible.map((r) => {
    const at = book[r.id];
    return {
      key: r.id,
      recipeId: r.id,
      name: at ? r.name : '？？？',
      collected: !!at,
      dateText: at ? `${mdText(toKey(new Date(at)))}收录` : r.season ? '节气限定' : '记入一次即可收录',
    };
  });
  return { count: items.filter((x) => x.collected).length, total: items.length, items };
}
