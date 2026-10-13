import { EXERCISES, exerciseById } from './catalog';
import type { DayKey } from './date';
import type { DayRecord, SetEntry } from './types';
import { activeLogs, fmtKg, isDoneDay } from './workout';

export interface PR {
  exId: string;
  kind: 'weight' | 'reps';
  value: number;
  prev: number;
  atWeight: number | null;
}

function doneSetsOf(day: DayRecord, exId: string): SetEntry[] {
  const log = day.exercises.find((e) => e.exId === exId);
  return log ? log.sets.filter((s) => s.done) : [];
}

export function detectPRs(day: DayRecord, history: DayRecord[]): PR[] {
  const prs: PR[] = [];
  for (const log of activeLogs(day)) {
    const cur = log.sets.filter((s) => s.done);
    if (!cur.length) continue;
    const hist = history.filter((h) => h.date < day.date).flatMap((h) => doneSetsOf(h, log.exId));
    if (!hist.length) continue;
    const curMaxW = Math.max(...cur.map((s) => s.w ?? 0));
    const histMaxW = Math.max(...hist.map((s) => s.w ?? 0));
    if (curMaxW > 0 && curMaxW > histMaxW) {
      prs.push({ exId: log.exId, kind: 'weight', value: curMaxW, prev: histMaxW, atWeight: curMaxW });
      continue;
    }
    const atW = curMaxW > 0 ? curMaxW : null;
    const sameW = (s: SetEntry) => (atW === null ? !s.w : s.w === atW);
    const prevReps = hist.filter(sameW).map((s) => s.r);
    if (!prevReps.length) continue;
    const curR = Math.max(...cur.filter(sameW).map((s) => s.r));
    const prevR = Math.max(...prevReps);
    if (curR > prevR) prs.push({ exId: log.exId, kind: 'reps', value: curR, prev: prevR, atWeight: atW });
  }
  return prs;
}

/** 只看一个动作的新纪录（规则与完成小结、海报完全相同：复用 detectPRs） */
export function exercisePR(day: DayRecord, history: DayRecord[], exId: string): PR | undefined {
  return detectPRs({ ...day, exercises: day.exercises.filter((e) => e.exId === exId) }, history)[0];
}

/** 今天这个动作里「破纪录的那一组」的下标；没有新纪录返回 -1（打勾当场给奖杯用） */
export function prSetIndex(day: DayRecord, history: DayRecord[], exId: string): number {
  const pr = exercisePR(day, history, exId);
  if (!pr) return -1;
  const log = day.exercises.find((e) => e.exId === exId);
  if (!log) return -1;
  return log.sets.findIndex((s) =>
    s.done && (pr.kind === 'weight' ? s.w === pr.value : (pr.atWeight === null ? !s.w : s.w === pr.atWeight) && s.r === pr.value),
  );
}

export function prText(pr: PR): string {
  const e = exerciseById(pr.exId)!;
  if (pr.kind === 'weight') return `新纪录 · ${e.name} ${fmtKg(pr.value)}kg（之前最高 ${fmtKg(pr.prev)}kg）`;
  const unit = e.unit === 'secs' ? '秒' : '次';
  const head = pr.atWeight != null ? `${fmtKg(pr.atWeight)}kg×${pr.value} ${unit}` : `${pr.value} ${unit}`;
  return `新纪录 · ${e.name} ${head}（之前最多 ${pr.prev} ${unit}）`;
}

export interface ProgressPoint {
  date: DayKey;
  w: number;
  r: number;
}

/** 每天取最大重量的那一组（同重量取次数多的） */
export function progressSeries(days: DayRecord[], exId: string): ProgressPoint[] {
  const out: ProgressPoint[] = [];
  for (const d of days) {
    let best: SetEntry | null = null;
    for (const s of doneSetsOf(d, exId)) {
      const w = s.w ?? 0;
      const bestW = best ? (best.w ?? 0) : -1;
      if (!best || w > bestW || (w === bestW && s.r > best.r)) best = s;
    }
    if (best) out.push({ date: d.date, w: best.w ?? 0, r: best.r });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 本月新纪录次数：本月最大重量超过本月之前最高的动作数 */
export function monthPRCount(days: DayRecord[], monthStart: DayKey, today: DayKey): number {
  let n = 0;
  for (const e of EXERCISES) {
    let before = 0;
    let during = 0;
    for (const d of days) {
      if (!isDoneDay(d)) continue;
      const mx = Math.max(0, ...doneSetsOf(d, e.id).map((s) => s.w ?? 0));
      if (d.date < monthStart) before = Math.max(before, mx);
      else if (d.date <= today) during = Math.max(during, mx);
    }
    if (before > 0 && during > before) n++;
  }
  return n;
}
