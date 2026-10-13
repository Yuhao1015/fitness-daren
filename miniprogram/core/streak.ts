import { addDays, diffDays, startOfWeek, type DayKey } from './date';

/** 相邻两次训练之间允许的最多休息日 */
export const MAX_REST_GAP = 2;

export interface StreakInfo {
  persistDays: number;
  alive: boolean;
  chainStart: DayKey | null;
  lastDone: DayKey | null;
}

function uniqSorted(days: DayKey[]): DayKey[] {
  return Array.from(new Set(days)).sort();
}

/** 已坚持 N 天：链存活时 N = 今天 − 链首 + 1（spec §5.1） */
export function computeStreak(doneDays: DayKey[], today: DayKey): StreakInfo {
  const past = uniqSorted(doneDays).filter((d) => d <= today);
  if (!past.length) return { persistDays: 0, alive: false, chainStart: null, lastDone: null };
  const last = past[past.length - 1];
  if (diffDays(today, last) > MAX_REST_GAP + 1) {
    return { persistDays: 0, alive: false, chainStart: null, lastDone: last };
  }
  let start = last;
  for (let i = past.length - 2; i >= 0; i--) {
    if (diffDays(start, past[i]) - 1 <= MAX_REST_GAP) start = past[i];
    else break;
  }
  return { persistDays: diffDays(today, start) + 1, alive: true, chainStart: start, lastDone: last };
}

/**
 * 从今天起还能连续休几天，链不会断（0–2）：今天或昨天练过 = 2，前天 = 1，大前天 = 0（今天不练就断）。
 * 页头用月亮表示；这就是规则里自带的「冻结」，练完一次月亮补满。
 */
export function restDaysLeft(doneDays: DayKey[], today: DayKey): number {
  const past = doneDays.filter((d) => d <= today);
  if (!past.length) return 0;
  const last = past.reduce((a, b) => (a > b ? a : b));
  const gap = diffDays(today, last);
  if (gap === 0) return MAX_REST_GAP;
  return Math.max(0, Math.min(MAX_REST_GAP, MAX_REST_GAP + 1 - gap));
}

/** 第 K 次打卡（终身累计，只增不减） */
export function totalCheckins(doneDays: DayKey[], today: DayKey): number {
  return uniqSorted(doneDays).filter((d) => d <= today).length;
}

export function weekProgress(doneDays: DayKey[], today: DayKey, target: number): { done: number; target: number } {
  const monday = startOfWeek(today);
  const done = uniqSorted(doneDays).filter((d) => d >= monday && d <= today).length;
  return { done, target };
}

/**
 * 连续达标 N 周：从最近一个达标的周往前数，每周（周一到周日）训练天数 ≥ 每周目标。
 * 本周还没过完：已达标就算进去，没达标也不打断（从上周开始数）。
 */
export function weeklyStreak(doneDays: DayKey[], today: DayKey, target: number): number {
  const days = uniqSorted(doneDays).filter((d) => d <= today);
  const goal = Math.max(1, target);
  const countIn = (monday: DayKey) => days.filter((d) => d >= monday && d <= addDays(monday, 6)).length;
  let monday = startOfWeek(today);
  if (countIn(monday) < goal) monday = addDays(monday, -7);
  let n = 0;
  while (countIn(monday) >= goal) {
    n++;
    monday = addDays(monday, -7);
  }
  return n;
}

/** 窗口 [from, to] 内最长的一条链（从链首到链上最后一次训练） */
export function longestPersist(doneDays: DayKey[], from: DayKey, to: DayKey): number {
  const days = uniqSorted(doneDays).filter((d) => d >= from && d <= to);
  let best = 0;
  let start: DayKey | null = null;
  let prev: DayKey | null = null;
  for (const d of days) {
    if (prev === null || diffDays(d, prev) - 1 > MAX_REST_GAP) start = d;
    prev = d;
    best = Math.max(best, diffDays(d, start as DayKey) + 1);
  }
  return best;
}
