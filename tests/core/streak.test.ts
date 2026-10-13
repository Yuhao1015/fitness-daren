import { describe, expect, it } from 'vitest';
import { computeStreak, longestPersist, totalCheckins, weekProgress } from '../../miniprogram/core/streak';

describe('streak', () => {
  it('is zero without training', () => {
    expect(computeStreak([], '2026-10-10')).toEqual({ persistDays: 0, alive: false, chainStart: null, lastDone: null });
  });
  it('counts today as day one', () => {
    expect(computeStreak(['2026-10-10'], '2026-10-10').persistDays).toBe(1);
  });
  it('lets a Mon/Wed/Fri routine keep growing through rest days', () => {
    const s = computeStreak(['2026-10-09', '2026-10-05', '2026-10-07'], '2026-10-10');
    expect(s.chainStart).toBe('2026-10-05');
    expect(s.persistDays).toBe(6);
    expect(s.alive).toBe(true);
  });
  it('breaks the chain after three rest days in a row', () => {
    const s = computeStreak(['2026-10-01', '2026-10-05', '2026-10-07'], '2026-10-07');
    expect(s.chainStart).toBe('2026-10-05');
    expect(s.persistDays).toBe(3);
  });
  it('stays alive up to two rest days after the last session', () => {
    expect(computeStreak(['2026-10-01'], '2026-10-04').persistDays).toBe(4);
    expect(computeStreak(['2026-10-01'], '2026-10-05')).toMatchObject({ persistDays: 0, alive: false, lastDone: '2026-10-01' });
  });
  it('ignores future days', () => {
    expect(computeStreak(['2026-10-10', '2026-10-12'], '2026-10-10').persistDays).toBe(1);
    expect(totalCheckins(['2026-10-01', '2026-10-10', '2026-10-12'], '2026-10-10')).toBe(2);
  });
  it('tracks weekly progress from Monday', () => {
    expect(weekProgress(['2026-10-04', '2026-10-05', '2026-10-08'], '2026-10-10', 3)).toEqual({ done: 2, target: 3 });
  });
  it('finds the longest chain inside a window', () => {
    const days = ['2026-08-01', '2026-08-03', '2026-08-05', '2026-08-20', '2026-08-21'];
    expect(longestPersist(days, '2026-07-20', '2026-08-31')).toBe(5);
  });
});
