import { CARDIO_TYPES, PARTS, exerciseById, partById, type Exercise, type PartId } from './catalog';
import { addDays, type DayKey } from './date';
import type { CardioTypeId, DayLookup, DayRecord, ExerciseLog, SetEntry } from './types';

export function bwFactor(bw: number | null): number {
  return (bw && bw > 0 ? bw : 70) / 70;
}

export function fmtKg(w: number): string {
  return Number.isInteger(w) ? String(w) : String(Math.round(w * 10) / 10);
}

export function setText(s: { w: number | null; r: number }, e: Exercise): string {
  const unit = e.unit === 'secs' ? '秒' : '';
  return (s.w != null && s.w > 0 ? fmtKg(s.w) + 'kg' : '自重') + '×' + s.r + unit;
}

/** 只统计当天计划部位内的动作（与原型一致：取消某部位后，它的组不计入） */
export function activeLogs(day: DayRecord): ExerciseLog[] {
  return day.exercises.filter((log) => {
    const e = exerciseById(log.exId);
    return !!e && day.parts.includes(e.part);
  });
}

export function doneSetCount(day: DayRecord): number {
  return activeLogs(day).reduce((n, log) => n + log.sets.filter((s) => s.done).length, 0);
}

export function totalSetCount(day: DayRecord): number {
  return activeLogs(day).reduce((n, log) => n + log.sets.length, 0);
}

function setVolume(s: SetEntry, e: Exercise): number {
  if (!s.done || e.unit === 'secs' || s.w == null) return 0;
  return s.w * s.r;
}

export function dayVolume(day: DayRecord): number {
  let v = 0;
  for (const log of activeLogs(day)) {
    const e = exerciseById(log.exId)!;
    for (const s of log.sets) v += setVolume(s, e);
  }
  return v;
}

export function strengthBurn(day: DayRecord, bw: number | null): number {
  let k = 0;
  for (const log of activeLogs(day)) {
    const e = exerciseById(log.exId)!;
    k += log.sets.filter((s) => s.done).length * e.kcalPerSet;
  }
  return Math.round(k * bwFactor(bw));
}

export function cardioBurn(day: DayRecord): number {
  if (!day.parts.includes('cardio') || !day.cardio || !day.cardio.kcal) return 0;
  return Math.max(0, Math.round(day.cardio.kcal));
}

export function estimateCardioKcal(type: CardioTypeId, mins: number, bw: number | null): number {
  const t = CARDIO_TYPES.find((c) => c.id === type) ?? CARDIO_TYPES[0];
  return Math.round(mins * t.kcalPerMin * bwFactor(bw));
}

export function dayBurn(day: DayRecord, bw: number | null): number {
  return strengthBurn(day, bw) + cardioBurn(day);
}

/** 训练分钟（估）= 完成组数 × 2.5 + 有氧分钟 */
export function trainingMinutes(day: DayRecord): number {
  const cardioMins = day.parts.includes('cardio') && day.cardio && day.cardio.mins ? day.cardio.mins : 0;
  return Math.round(doneSetCount(day) * 2.5) + cardioMins;
}

export function isDoneDay(day?: DayRecord): boolean {
  return !!day && day.done && day.parts.length > 0;
}

export function canComplete(day: DayRecord): boolean {
  return doneSetCount(day) > 0 || cardioBurn(day) > 0;
}

export interface LastPerf {
  set: SetEntry;
  date: DayKey;
  daysAgo: number;
}

export function lastPerformance(lookup: DayLookup, exId: string, before: DayKey, maxLookback = 60): LastPerf | null {
  for (let n = 1; n <= maxLookback; n++) {
    const k = addDays(before, -n);
    const d = lookup(k);
    if (!d) continue;
    const log = d.exercises.find((e) => e.exId === exId);
    const done = log ? log.sets.filter((s) => s.done) : [];
    if (done.length) return { set: done[done.length - 1], date: k, daysAgo: n };
  }
  return null;
}

/** 上次练这个动作那天的全部已完成组（「照上次」用），按原顺序 */
export function lastSessionSets(lookup: DayLookup, exId: string, before: DayKey, maxLookback = 60): { sets: SetEntry[]; date: DayKey } | null {
  const last = lastPerformance(lookup, exId, before, maxLookback);
  if (!last) return null;
  const d = lookup(last.date)!;
  const log = d.exercises.find((e) => e.exId === exId)!;
  return { sets: log.sets.filter((s) => s.done), date: last.date };
}

export function daysSincePart(
  lookup: DayLookup,
  part: PartId,
  from: DayKey,
  opts: { doneOnly: boolean; max?: number },
): number | null {
  const max = opts.max ?? 30;
  for (let n = 1; n <= max; n++) {
    const d = lookup(addDays(from, -n));
    if (!d || !d.parts.includes(part)) continue;
    if (opts.doneOnly && !d.done) continue;
    return n;
  }
  return null;
}

/** 推荐休息最久的部位；从没练过的部位优先；同分取目录靠前的（与原型一致） */
export function suggestPart(lookup: DayLookup, today: DayKey): { part: PartId; daysAgo: number | null } {
  let best: { part: PartId; daysAgo: number | null; score: number } = { part: PARTS[0].id, daysAgo: null, score: -1 };
  for (const p of PARTS) {
    const d = daysSincePart(lookup, p.id, today, { doneOnly: true });
    const score = d === null ? 99 : d;
    if (score > best.score) best = { part: p.id, daysAgo: d, score };
  }
  return { part: best.part, daysAgo: best.daysAgo };
}

export function suggestText(s: { part: PartId; daysAgo: number | null }): string {
  const name = partById(s.part).name;
  return `推荐练「${name}」` + (s.daysAgo ? ` · 已休息 ${s.daysAgo} 天` : ' · 最近没练过');
}

/** 同一力量部位 2 天内已计划或已练过时提示（有氧不提示） */
export function recoveryHint(lookup: DayLookup, date: DayKey, parts: PartId[]): string {
  for (const p of parts) {
    if (p === 'cardio') continue;
    const n = daysSincePart(lookup, p, date, { doneOnly: false, max: 2 });
    if (n !== null) {
      const name = partById(p).name;
      return `${name}${name.length === 1 ? '部' : ''} ${n} 天前刚练过，建议同一部位间隔 48 小时`;
    }
  }
  return '';
}
