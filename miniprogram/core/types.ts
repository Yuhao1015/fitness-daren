import type { DayKey } from './date';
import type { CardioTypeId, PartId } from './catalog';

export type { DayKey, PartId, CardioTypeId };

export type Goal = 'bulk' | 'cut' | 'maintain';
export type WeeklyTarget = 2 | 3 | 4 | 5;

/** w = null 表示自重；平板支撑的 r 表示秒 */
export interface SetEntry {
  w: number | null;
  r: number;
  done: boolean;
  at?: number;
}

export interface ExerciseLog {
  exId: string;
  sets: SetEntry[];
}

export interface CardioLog {
  type: CardioTypeId;
  mins: number | null;
  kcal: number | null;
  source: 'device' | 'estimate';
}

export type FoodSource = 'calc' | 'recipe' | 'quick';

export interface FoodDraft {
  title: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  src: FoodSource;
  recipeId?: string;
}

export interface FoodItem extends FoodDraft {
  id: string;
  at: number;
}

export interface DayRecord {
  date: DayKey;
  parts: PartId[];
  done: boolean;
  exercises: ExerciseLog[];
  cardio: CardioLog | null;
  food: FoodItem[];
  finishedAt: number | null;
  updatedAt: number;
}

export interface Profile {
  goal: Goal;
  weeklyTarget: WeeklyTarget;
  bodyweightKg: number | null;
  nickname: string | null;
  avatarUrl: string | null;
  shareDetailToBuddies: boolean;
  onboardedAt: number | null;
}

export type DayLookup = (k: DayKey) => DayRecord | undefined;

export function emptyDay(date: DayKey): DayRecord {
  return { date, parts: [], done: false, exercises: [], cardio: null, food: [], finishedAt: null, updatedAt: 0 };
}
