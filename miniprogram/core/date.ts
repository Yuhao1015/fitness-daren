export type DayKey = string;

const MS_DAY = 86400000;
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function split(k: DayKey): [number, number, number] {
  const [y, m, d] = k.split('-').map(Number);
  return [y, m, d];
}

function utcOf(k: DayKey): number {
  const [y, m, d] = split(k);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): DayKey {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 用设备本地时区的年月日生成 key */
export function toKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: number = Date.now()): DayKey {
  return toKey(new Date(now));
}

export function keyOf(year: number, month0: number, day: number): DayKey {
  return fromUtc(Date.UTC(year, month0, day));
}

export function addDays(k: DayKey, n: number): DayKey {
  return fromUtc(utcOf(k) + n * MS_DAY);
}

/** a − b，单位：天 */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((utcOf(a) - utcOf(b)) / MS_DAY);
}

/** 周一 = 0 … 周日 = 6 */
export function weekdayMon0(k: DayKey): number {
  return (new Date(utcOf(k)).getUTCDay() + 6) % 7;
}

export function startOfWeek(k: DayKey): DayKey {
  return addDays(k, -weekdayMon0(k));
}

/** 'YYYY-MM' */
export function monthOf(k: DayKey): string {
  return k.slice(0, 7);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** 周一开头的月历格子；月初之前用 null 补位 */
export function monthGrid(year: number, month0: number): Array<DayKey | null> {
  const first = keyOf(year, month0, 1);
  const cells: Array<DayKey | null> = [];
  for (let i = 0; i < weekdayMon0(first); i++) cells.push(null);
  const n = daysInMonth(year, month0);
  for (let d = 1; d <= n; d++) cells.push(keyOf(year, month0, d));
  return cells;
}

export function mdText(k: DayKey): string {
  const [, m, d] = split(k);
  return `${m}月${d}日`;
}

export function weekdayText(k: DayKey): string {
  return '周' + WEEK_CN[new Date(utcOf(k)).getUTCDay()];
}

/** 闭区间 [from, to] 的所有日期 */
export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}
