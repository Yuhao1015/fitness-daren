import { describe, expect, it } from 'vitest';
import {
  addDays, dayRange, daysInMonth, diffDays, keyOf, mdText, monthGrid, monthOf,
  startOfWeek, toKey, weekdayMon0, weekdayText,
} from '../../miniprogram/core/date';

describe('date', () => {
  it('pads month and day', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(keyOf(2026, 9, 1)).toBe('2026-10-01');
  });
  it('adds days across month, year and leap day', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('diffs days', () => {
    expect(diffDays('2026-03-01', '2026-02-27')).toBe(2);
    expect(diffDays('2026-10-10', '2026-10-10')).toBe(0);
    expect(diffDays('2026-10-01', '2026-10-10')).toBe(-9);
  });
  it('computes weekdays with Monday first', () => {
    expect(weekdayMon0('2026-10-12')).toBe(0); // 周一
    expect(weekdayMon0('2026-10-10')).toBe(5); // 周六
    expect(startOfWeek('2026-10-10')).toBe('2026-10-05');
    expect(weekdayText('2026-10-10')).toBe('周六');
  });
  it('builds a Monday-first month grid', () => {
    const g = monthGrid(2026, 9);
    expect(g.slice(0, 3)).toEqual([null, null, null]);
    expect(g[3]).toBe('2026-10-01');
    expect(g.length).toBe(34);
    expect(daysInMonth(2028, 1)).toBe(29);
  });
  it('formats and slices', () => {
    expect(mdText('2026-10-10')).toBe('10月10日');
    expect(monthOf('2026-10-10')).toBe('2026-10');
    expect(dayRange('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });
});
