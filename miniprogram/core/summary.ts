import type { DayKey } from './date';
import { computeStreak } from './streak';
import type { DayRecord, PartId } from './types';
import { dayBurn, dayVolume, isDoneDay } from './workout';

export interface PublicSummary {
  date: DayKey;
  persistDays: number;
  parts: PartId[];
  burn: number;
  volume: number;
}

export function buildSummary(day: DayRecord | undefined, doneKeys: DayKey[], today: DayKey, bw: number | null): PublicSummary {
  const persistDays = computeStreak(doneKeys, today).persistDays;
  if (!day || !isDoneDay(day)) return { date: today, persistDays, parts: [], burn: 0, volume: 0 };
  return { date: today, persistDays, parts: day.parts, burn: dayBurn(day, bw), volume: Math.round(dayVolume(day)) };
}
