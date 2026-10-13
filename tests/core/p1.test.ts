import { describe, expect, it } from 'vitest';
import { BADGES, badgeEntryVM, type BadgeStats } from '../../miniprogram/core/badges';
import { EXERCISES } from '../../miniprogram/core/catalog';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { ICONS } from '../../miniprogram/core/icons';
import { bodyMapSvg, CROPS } from '../../miniprogram/core/muscle';
import { EXERCISE_MUSCLES, exerciseFigure, muscleLevel, weeklyMuscleSets } from '../../miniprogram/core/muscle-map';
import { weeklyStreak } from '../../miniprogram/core/streak';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { partChips, partRest } from '../../miniprogram/viewmodels/common';

const T = '2026-10-10'; // 周六；本周一 = 10-05

function withSets(d: DayRecord, exId: string, n: number, done = true): DayRecord {
  for (let i = 0; i < n; i++) {
    d = addSet(d, exId, { w: 50, r: 8 });
    d = updateSet(d, exId, i, { done }, 0);
  }
  return d;
}

describe('weeklyStreak (连续达标周数)', () => {
  it('counts consecutive weeks that met the weekly target, without breaking on the week in progress', () => {
    const wk = (mon: string, n: number) => Array.from({ length: n }, (_, i) => `${mon.slice(0, 8)}${String(Number(mon.slice(8)) + i).padStart(2, '0')}`);
    const done = [...wk('2026-09-14', 3), ...wk('2026-09-21', 3), ...wk('2026-09-28', 3), ...wk('2026-10-05', 1)];
    expect(weeklyStreak(done, T, 3)).toBe(3);
    expect(weeklyStreak([...done, '2026-10-08', '2026-10-09'], T, 3)).toBe(4);
    expect(weeklyStreak([...wk('2026-09-14', 3), ...wk('2026-09-28', 3)], T, 3)).toBe(1);
    expect(weeklyStreak([], T, 3)).toBe(0);
    expect(weeklyStreak(wk('2026-09-28', 2), T, 3)).toBe(0);
  });
});

describe('badgeEntryVM (徽章入口卡)', () => {
  const stats: BadgeStats = { checkins: 9, longestPersist: 8, prCount: 2, volumeKg: 800, dishCount: 1, buddies: 0, challengesDone: 0, pathfinders: 0 };
  it('shows the 3 most recent badges, newest first, and the closest next one', () => {
    const owned = { first: 100, 'persist-7': 300, 'pr-1': 200, 'dish-6': 50, 'no-such-badge': 999 } as Record<string, number>;
    const vm = badgeEntryVM(stats, owned);
    expect(vm.recent.map((r) => r.key)).toEqual(['persist-7', 'pr-1', 'first']);
    expect(vm.earnedText).toBe(`4/${BADGES.length}`);
    expect(vm.next).not.toBeNull();
    expect(vm.next!.pct).toBeGreaterThan(0);
    expect(vm.next!.pct).toBeLessThan(100);
    for (const b of BADGES.filter((x) => !(x.id in owned) && stats[x.metric] < x.target)) {
      const pct = Math.min(100, Math.round((stats[b.metric] / b.target) * 100));
      expect(pct).toBeLessThanOrEqual(vm.next!.pct);
    }
  });
  it('skips badges whose goal is already met but not yet handed out', () => {
    const vm = badgeEntryVM({ ...stats, checkins: 40 }, {});
    expect(vm.next!.name).not.toBe('第一次');
    expect(vm.next!.name).not.toBe('十次打卡');
  });

  it('has a placeholder state with nothing earned', () => {
    const vm = badgeEntryVM({ ...stats, checkins: 0, longestPersist: 0, prCount: 0, volumeKg: 0, dishCount: 0 }, {});
    expect(vm.recent).toEqual([]);
    expect(vm.next!.name).toBe('第一次');
  });
});

describe('exercise → muscles', () => {
  it('maps every exercise to at least one primary muscle that can be drawn', () => {
    for (const e of EXERCISES) {
      const m = EXERCISE_MUSCLES[e.id];
      expect(m, e.id).toBeDefined();
      expect(m.main.length, e.id).toBeGreaterThan(0);
      const f = exerciseFigure(e.id);
      expect(f.highlight.length, e.id).toBeGreaterThan(0);
      expect(ICONS['ex-' + e.id], e.id).toBeDefined();
    }
  });
  it('picks the side and framing that shows the main muscles', () => {
    expect(exerciseFigure('bench-press')).toMatchObject({ view: 'front', highlight: ['pec'], crop: CROPS.torso });
    expect(exerciseFigure('pull-up')).toMatchObject({ view: 'back', highlight: ['lat'] });
    expect(exerciseFigure('pushdown')).toMatchObject({ view: 'back', highlight: ['triceps'], crop: CROPS.arms });
    expect(exerciseFigure('barbell-curl')).toMatchObject({ view: 'front', highlight: ['biceps'], crop: CROPS.arms });
    expect(exerciseFigure('leg-curl')).toMatchObject({ view: 'back', crop: CROPS.legs });
    expect(exerciseFigure('crunch')).toMatchObject({ view: 'front', crop: CROPS.core });
    expect(exerciseFigure('deadlift').view).toBe('back');
  });
});

describe('weeklyMuscleSets', () => {
  it('counts finished sets per muscle (main = 1, assist = 0.5) inside the window, done days only', () => {
    let mon = togglePart(emptyDay('2026-10-05'), 'chest');
    mon = setDone(withSets(mon, 'bench-press', 4), true, 0);
    let tue = togglePart(emptyDay('2026-10-06'), 'back');
    tue = setDone(withSets(withSets(tue, 'pull-up', 3), 'barbell-row', 2, false), true, 0);
    const notDone = withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', 5);
    const lastWeek = setDone(withSets(togglePart(emptyDay('2026-10-01'), 'chest'), 'bench-press', 9), true, 0);
    const sets = weeklyMuscleSets([mon, tue, notDone, lastWeek], '2026-10-05', T);
    expect(sets.pec).toBe(4);
    expect(sets.triceps).toBe(2);
    expect(sets.lat).toBe(3);
    expect(sets.biceps).toBe(1.5);
    expect(sets.quad ?? 0).toBe(0);
  });
  it('turns set counts into 3 intensity levels', () => {
    expect([0, 0.5, 1, 4.5, 5, 9.5, 10, 30].map(muscleLevel)).toEqual([0, 1, 1, 1, 2, 2, 3, 3]);
  });
});

describe('bodyMapSvg (全身肌群图)', () => {
  it('draws the whole figure and only the trained muscles, at their level', () => {
    const svg = bodyMapSvg('front', { pec: 3, quad: 1 }, '#2E7D4F');
    expect(svg).toContain('viewBox="0 0 64 128"');
    expect(svg).not.toContain('currentColor');
    expect(svg.match(/<g opacity="1"/g)).toHaveLength(1);
    expect(svg.match(/<g opacity="\.4"/g)).toHaveLength(1);
    expect(bodyMapSvg('front', { lat: 3 }, '#000')).toBe(bodyMapSvg('front', {}, '#000'));
  });
});

describe('part tiles show recovery (P1-1)', () => {
  const lookupOf = (days: DayRecord[]) => {
    const m = new Map(days.map((d) => [d.date, d]));
    return (k: string) => m.get(k);
  };
  it('badges days since each part was last trained, and dims parts trained in the last 48 hours', () => {
    const lookup = lookupOf([
      setDone(togglePart(emptyDay('2026-10-09'), 'chest'), true, 0),
      setDone(togglePart(emptyDay('2026-10-07'), 'leg'), true, 0),
      setDone(togglePart(emptyDay('2026-09-20'), 'back'), true, 0),
      togglePart(emptyDay('2026-10-08'), 'arm'),
    ]);
    const rest = partRest(lookup, T);
    const chips = partChips([], rest);
    const by = (id: string) => chips.find((c) => c.id === id)!;
    expect(by('chest')).toMatchObject({ badge: '1', dim: true });
    expect(by('leg')).toMatchObject({ badge: '3', dim: false });
    expect(by('back')).toMatchObject({ badge: '7+', dim: false });
    expect(by('arm')).toMatchObject({ badge: '', dim: false });
    expect(by('cardio')).toMatchObject({ badge: '', dim: false });
    expect(partChips(['chest'])[1]).toMatchObject({ badge: '', dim: false });
    expect(partChips(['chest'], rest)[1]).toMatchObject({ badge: '1', dim: false, on: true });
  });
});
