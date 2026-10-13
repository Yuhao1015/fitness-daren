import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { BADGES, badgeStats, badgeWallVM, lifetimePRCount, newlyEarned, type BadgeStats } from '../../miniprogram/core/badges';

function bench(date: string, w: number): DayRecord {
  let d = togglePart(emptyDay(date), 'chest');
  for (let i = 0; i < 3; i++) { d = addSet(d, 'bench-press', { w, r: 8 }); d = updateSet(d, 'bench-press', i, { done: true }, 0); }
  return setDone(d, true, 0);
}
const zero: BadgeStats = { checkins: 0, longestPersist: 0, prCount: 0, volumeKg: 0, dishCount: 0, buddies: 0, challengesDone: 0, pathfinders: 0 };

describe('badges', () => {
  it('has unique ids and positive targets', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(BADGES.every((b) => b.target > 0)).toBe(true);
  });
  it('counts lifetime weight PRs, not the first session', () => {
    expect(lifetimePRCount([bench('2026-10-01', 50), bench('2026-10-03', 52.5), bench('2026-10-05', 52.5), bench('2026-10-07', 55)])).toBe(2);
  });
  it('derives stats from local days and social counts', () => {
    const days = [bench('2026-10-01', 50), bench('2026-10-03', 55)];
    const s = badgeStats({ all: days, doneKeys: days.map((d) => d.date), today: '2026-10-04', dishCount: 2, social: { buddies: 1, challengesDone: 0, pathfinders: 3 } });
    expect(s).toEqual({ checkins: 2, longestPersist: 4, prCount: 1, volumeKg: 2520, dishCount: 2, buddies: 1, challengesDone: 0, pathfinders: 3 });
  });
  it('returns only newly earned badges', () => {
    const s = { ...zero, checkins: 10, prCount: 1, pathfinders: 1 };
    expect(newlyEarned(s, {}).map((b) => b.id).sort()).toEqual(['count-10', 'first', 'path-1', 'pr-1']);
    expect(newlyEarned(s, { first: 1, 'count-10': 1, 'path-1': 1, 'pr-1': 1 })).toEqual([]);
  });
  it('builds the wall with progress text', () => {
    const vm = badgeWallVM({ ...zero, volumeKg: 2520, checkins: 1 }, { first: new Date(2026, 9, 1, 12).getTime() });
    expect(vm.earned).toBe(1);
    expect(vm.total).toBe(BADGES.length);
    expect(vm.groups.map((g) => g.title)).toEqual(['坚持', '力量', '社交与收集']);
    const first = vm.groups[0].items.find((x) => x.id === 'first')!;
    expect(first).toMatchObject({ earned: true, dateText: '10月1日获得' });
    const ton = vm.groups[1].items.find((x) => x.id === 'vol-10t')!;
    expect(ton).toMatchObject({ earned: false, progressText: '2.5 / 10 吨', pct: 25 });
  });
});
