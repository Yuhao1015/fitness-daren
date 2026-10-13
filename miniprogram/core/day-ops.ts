import { sortParts, type PartId } from './catalog';
import type { CardioLog, DayRecord, FoodItem, SetEntry } from './types';

export const MAX_SETS = 10;

export function setsOf(day: DayRecord, exId: string): SetEntry[] {
  const log = day.exercises.find((e) => e.exId === exId);
  return log ? log.sets : [];
}

function withSets(day: DayRecord, exId: string, fn: (sets: SetEntry[]) => SetEntry[]): DayRecord {
  const idx = day.exercises.findIndex((e) => e.exId === exId);
  const current = idx >= 0 ? day.exercises[idx].sets.map((s) => ({ ...s })) : [];
  const exercises = day.exercises.slice();
  const next = { exId, sets: fn(current) };
  if (idx >= 0) exercises[idx] = next;
  else exercises.push(next);
  return { ...day, exercises };
}

export function setParts(day: DayRecord, parts: PartId[]): DayRecord {
  const sorted = sortParts(parts);
  return {
    ...day,
    parts: sorted,
    done: sorted.length ? day.done : false,
    finishedAt: sorted.length ? day.finishedAt : null,
  };
}

export function togglePart(day: DayRecord, part: PartId): DayRecord {
  const has = day.parts.includes(part);
  return setParts(day, has ? day.parts.filter((p) => p !== part) : [...day.parts, part]);
}

export function setDone(day: DayRecord, done: boolean, now: number): DayRecord {
  return { ...day, done, finishedAt: done ? (day.finishedAt ?? now) : null };
}

export function addSet(day: DayRecord, exId: string, seed: { w: number | null; r: number }): DayRecord {
  return withSets(day, exId, (sets) => {
    if (sets.length >= MAX_SETS) return sets;
    const last = sets.length ? sets[sets.length - 1] : seed;
    return [...sets, { w: last.w, r: last.r, done: false }];
  });
}

/** 「照上次」：按给定的重量×次数一次追加多组（都未打勾），不超过组数上限 */
export function addSets(day: DayRecord, exId: string, seeds: { w: number | null; r: number }[]): DayRecord {
  if (!seeds.length) return day;
  return withSets(day, exId, (sets) => [...sets, ...seeds.map((s) => ({ w: s.w, r: s.r, done: false }))].slice(0, MAX_SETS));
}

export function removeLastSet(day: DayRecord, exId: string): DayRecord {
  return withSets(day, exId, (sets) => sets.slice(0, -1));
}

export function updateSet(day: DayRecord, exId: string, index: number, patch: Partial<SetEntry>, now: number): DayRecord {
  return withSets(day, exId, (sets) => {
    if (!sets[index]) return sets;
    const next = { ...sets[index], ...patch };
    if (patch.done === true) next.at = now;
    if (patch.done === false) delete next.at;
    sets[index] = next;
    return sets;
  });
}

export function setCardio(day: DayRecord, patch: Partial<CardioLog>): DayRecord {
  const base: CardioLog = { type: 'run', mins: null, kcal: null, source: 'device' };
  return { ...day, cardio: { ...base, ...(day.cardio ?? {}), ...patch } };
}

export function addFood(day: DayRecord, item: FoodItem): DayRecord {
  return { ...day, food: [...day.food, item] };
}

export function removeFood(day: DayRecord, id: string): DayRecord {
  return { ...day, food: day.food.filter((f) => f.id !== id) };
}

export function ensurePart(day: DayRecord, part: PartId): DayRecord {
  return day.parts.includes(part) ? day : togglePart(day, part);
}

/** 专注模式「完成这一组」：填第一个未完成的组，没有则新增；10 组都完成时原样返回 */
export function completeNextSet(day: DayRecord, exId: string, draft: { w: number | null; r: number }, now: number): DayRecord {
  const sets = setsOf(day, exId);
  let idx = sets.findIndex((s) => !s.done);
  let d = day;
  if (idx < 0) {
    if (sets.length >= MAX_SETS) return day;
    d = addSet(day, exId, draft);
    idx = sets.length;
  }
  return updateSet(d, exId, idx, { w: draft.w, r: draft.r, done: true }, now);
}
