import { exerciseById, partById } from '../core/catalog';
import type { DayKey } from '../core/date';
import { setsOf } from '../core/day-ops';
import { exercisePR } from '../core/records';
import { fmtClock, remaining, type RestTimer } from '../core/timer';
import type { DayLookup, DayRecord } from '../core/types';
import { fmtKg, lastPerformance, setText } from '../core/workout';
import { seedFor } from './today';

export interface FocusInput {
  today: DayKey;
  day: DayRecord;
  exId: string;
  lookup: DayLookup;
  draft: { w: number | null; r: number };
  timer: RestTimer;
  now: number;
  /** 今天之前的训练记录，用来当场判断新纪录；不传就不判断 */
  history?: DayRecord[];
}

export interface FocusVM {
  name: string; partName: string; partColor: string; lastText: string; canUseLast: boolean;
  /** 动作小人形图标（只高亮主要肌群），见 core/muscle-map.ts */
  figure: string;
  dots: { key: string; done: boolean }[]; completeLabel: string;
  wText: string; wUnit: string; rText: string; rUnit: string;
  resting: boolean; restText: string; restPct: number;
  overload: { show: boolean; label: string; w: number | null };
  /** 刚刷新的纪录（只放数字：60kg 或 50kg×10），没有为空 */
  prText: string;
}

export function initialDraft(day: DayRecord, exId: string, lookup: DayLookup, today: DayKey): { w: number | null; r: number } {
  const sets = setsOf(day, exId);
  const pending = sets.find((s) => !s.done);
  if (pending) return { w: pending.w, r: pending.r };
  const doneToday = sets.filter((s) => s.done);
  if (doneToday.length) {
    const last = doneToday[doneToday.length - 1];
    return { w: last.w, r: last.r };
  }
  return seedFor(lookup, exId, today);
}

export function buildFocusVM(i: FocusInput): FocusVM {
  const ex = exerciseById(i.exId);
  if (!ex) throw new Error('unknown exercise ' + i.exId);
  const part = partById(ex.part);
  const sets = setsOf(i.day, i.exId);
  const pending = sets.findIndex((s) => !s.done);
  const setNo = (pending < 0 ? sets.length : pending) + 1;
  const last = lastPerformance(i.lookup, i.exId, i.today);
  const lastDay = last ? i.lookup(last.date) : undefined;
  const lastSets = lastDay ? setsOf(lastDay, i.exId) : [];
  const lastMax = lastSets.length ? Math.max(...lastSets.map((s) => s.w ?? 0)) : 0;
  const clean = ex.defaultW !== null && lastSets.length >= 2 && lastSets.every((s) => s.done) && lastMax > 0;
  const left = remaining(i.timer, i.now);
  const pr = i.history ? exercisePR(i.day, i.history, i.exId) : undefined;
  const unit = ex.unit === 'secs' ? '秒' : '';
  const prText = !pr ? '' : pr.kind === 'weight' ? fmtKg(pr.value) + 'kg' : (pr.atWeight != null ? fmtKg(pr.atWeight) + 'kg×' : '×') + pr.value + unit;
  return {
    name: ex.name,
    figure: 'ex-' + ex.id,
    partName: part.name,
    partColor: part.color,
    lastText: last ? '上次 ' + setText(last.set, ex) : '首次记录',
    canUseLast: !!last,
    dots: sets.map((s, j) => ({ key: String(j), done: s.done })),
    completeLabel: `完成第 ${setNo} 组`,
    wText: i.draft.w == null ? '自重' : fmtKg(i.draft.w),
    wUnit: i.draft.w == null ? '' : 'kg',
    rText: String(i.draft.r),
    rUnit: ex.unit === 'secs' ? '秒' : '次',
    resting: left > 0,
    restText: fmtClock(left),
    restPct: i.timer.total ? Math.round((left / i.timer.total) * 100) : 0,
    overload: clean && i.draft.w === lastMax ? { show: true, label: '+2.5kg 试试', w: lastMax + 2.5 } : { show: false, label: '', w: null },
    prText,
  };
}
