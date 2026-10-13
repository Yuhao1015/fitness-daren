import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { detectPRs, monthPRCount, prText, progressSeries } from '../../miniprogram/core/records';

function day(date: string, exId: string, part: 'chest' | 'core', sets: Array<[number | null, number]>): DayRecord {
  let d = togglePart(emptyDay(date), part);
  sets.forEach(([w, r], i) => {
    d = addSet(d, exId, { w, r });
    d = updateSet(d, exId, i, { w, r, done: true }, 0);
  });
  return setDone(d, true, 0);
}

describe('records', () => {
  it('ignores the very first session of an exercise', () => {
    expect(detectPRs(day('2026-10-10', 'bench-press', 'chest', [[50, 8]]), [])).toEqual([]);
  });
  it('detects a weight PR', () => {
    const hist = [day('2026-10-03', 'bench-press', 'chest', [[50, 8], [52.5, 6]])];
    const prs = detectPRs(day('2026-10-10', 'bench-press', 'chest', [[55, 5]]), hist);
    expect(prs).toEqual([{ exId: 'bench-press', kind: 'weight', value: 55, prev: 52.5, atWeight: 55 }]);
    expect(prText(prs[0])).toBe('新纪录 · 杠铃卧推 55kg（之前最高 52.5kg）');
  });
  it('detects a reps PR at the same top weight', () => {
    const hist = [day('2026-10-03', 'bench-press', 'chest', [[52.5, 6]])];
    const prs = detectPRs(day('2026-10-10', 'bench-press', 'chest', [[52.5, 8]]), hist);
    expect(prText(prs[0])).toBe('新纪录 · 杠铃卧推 52.5kg×8 次（之前最多 6 次）');
  });
  it('handles bodyweight and timed moves', () => {
    const hist = [day('2026-10-03', 'plank', 'core', [[null, 45]])];
    const prs = detectPRs(day('2026-10-10', 'plank', 'core', [[null, 60]]), hist);
    expect(prText(prs[0])).toBe('新纪录 · 平板支撑 60 秒（之前最多 45 秒）');
  });
  it('does not count history after the day', () => {
    const later = [day('2026-10-12', 'bench-press', 'chest', [[60, 5]])];
    expect(detectPRs(day('2026-10-10', 'bench-press', 'chest', [[55, 5]]), later)).toEqual([]);
  });
  it('builds a progress series with the best set per day', () => {
    const days = [
      day('2026-10-07', 'bench-press', 'chest', [[52.5, 8], [55, 3]]),
      day('2026-10-03', 'bench-press', 'chest', [[50, 8]]),
    ];
    expect(progressSeries(days, 'bench-press')).toEqual([
      { date: '2026-10-03', w: 50, r: 8 },
      { date: '2026-10-07', w: 55, r: 3 },
    ]);
  });
  it('counts monthly PRs against the best before the month', () => {
    const days = [
      day('2026-09-20', 'bench-press', 'chest', [[50, 8]]),
      day('2026-10-03', 'bench-press', 'chest', [[55, 5]]),
    ];
    expect(monthPRCount(days, '2026-10-01', '2026-10-10')).toBe(1);
  });
});
