import { describe, expect, it } from 'vitest';
import { MAX_SETS, addSet, addSets, setDone, setsOf, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { exercisePR, prSetIndex } from '../../miniprogram/core/records';
import { RestClock } from '../../miniprogram/core/rest-clock';
import { restDaysLeft } from '../../miniprogram/core/streak';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { lastSessionSets } from '../../miniprogram/core/workout';

const T = '2026-10-10';

function withSets(d: DayRecord, exId: string, sets: Array<[number | null, number, boolean]>): DayRecord {
  sets.forEach(([w, r, done], i) => {
    d = addSet(d, exId, { w, r });
    d = updateSet(d, exId, i, { w, r, done }, 0);
  });
  return d;
}
const lookupOf = (days: DayRecord[]) => {
  const m = new Map(days.map((d) => [d.date, d]));
  return (k: string) => m.get(k);
};

describe('lastSessionSets (照上次：整套组)', () => {
  it('returns every finished set of the most recent session, in order', () => {
    const older = withSets(togglePart(emptyDay('2026-10-01'), 'chest'), 'bench-press', [[40, 10, true]]);
    const last = withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[50, 10, true], [55, 8, true], [57.5, 6, true], [60, 3, false]]);
    const r = lastSessionSets(lookupOf([older, last]), 'bench-press', T)!;
    expect(r.date).toBe('2026-10-07');
    expect(r.sets.map((s) => [s.w, s.r])).toEqual([[50, 10], [55, 8], [57.5, 6]]);
  });
  it('skips sessions with no finished set, and gives up after the lookback', () => {
    const empty = withSets(togglePart(emptyDay('2026-10-09'), 'chest'), 'bench-press', [[50, 10, false]]);
    expect(lastSessionSets(lookupOf([empty]), 'bench-press', T)).toBeNull();
    const ancient = withSets(togglePart(emptyDay('2026-06-01'), 'chest'), 'bench-press', [[50, 10, true]]);
    expect(lastSessionSets(lookupOf([ancient]), 'bench-press', T)).toBeNull();
  });
});

describe('addSets', () => {
  it('appends unchecked copies and never goes over the set cap', () => {
    const day = addSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [{ w: 50, r: 10 }, { w: 55, r: 8 }]);
    expect(setsOf(day, 'bench-press')).toEqual([{ w: 50, r: 10, done: false }, { w: 55, r: 8, done: false }]);
    const many = addSets(day, 'bench-press', Array(20).fill({ w: 60, r: 5 }));
    expect(setsOf(many, 'bench-press')).toHaveLength(MAX_SETS);
    expect(addSets(day, 'bench-press', [])).toEqual(day);
  });
});

describe('restDaysLeft (还能休几天链不断)', () => {
  it('counts the rest days still allowed from today', () => {
    expect(restDaysLeft([T], T)).toBe(2);
    expect(restDaysLeft(['2026-10-09'], T)).toBe(2);
    expect(restDaysLeft(['2026-10-08'], T)).toBe(1);
    expect(restDaysLeft(['2026-10-07'], T)).toBe(0);
    expect(restDaysLeft(['2026-10-06'], T)).toBe(0);
    expect(restDaysLeft([], T)).toBe(0);
    expect(restDaysLeft(['2026-10-12'], T)).toBe(0);
  });
});

describe('RestClock (列表与专注模式共用的组间休息)', () => {
  it('runs, adjusts, skips and fires the end signal exactly once', () => {
    const c = new RestClock();
    expect(c.left(0)).toBe(0);
    c.start('bench-press', 120, 1000);
    expect(c.exId).toBe('bench-press');
    expect(c.left(1000)).toBe(120);
    expect(c.left(31_000)).toBe(90);
    c.adjust(15, 31_000);
    expect(c.left(31_000)).toBe(105);
    expect(c.tick(60_000)).toBe(false);
    expect(c.tick(200_000)).toBe(true);
    expect(c.tick(201_000)).toBe(false);
    expect(c.left(201_000)).toBe(0);
    expect(c.exId).toBe('');
    c.start('squat', 90, 0);
    c.skip();
    expect(c.left(0)).toBe(0);
    expect(c.tick(100_000)).toBe(false);
  });
  it('drops to idle when adjusted below zero, without firing', () => {
    const c = new RestClock();
    c.start('squat', 10, 0);
    c.adjust(-15, 0);
    expect(c.left(0)).toBe(0);
    expect(c.tick(1)).toBe(false);
  });
});

describe('exercisePR / prSetIndex (打勾当场判定新纪录)', () => {
  const hist = [setDone(withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[55, 8, true], [57.5, 6, true]]), true, 0)];
  it('finds the set that broke the weight record', () => {
    const day = withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[55, 8, true], [60, 3, true], [60, 2, true]]);
    expect(exercisePR(day, hist, 'bench-press')).toMatchObject({ kind: 'weight', value: 60, prev: 57.5 });
    expect(prSetIndex(day, hist, 'bench-press')).toBe(1);
  });
  it('finds a reps record at the same weight', () => {
    const day = withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[57.5, 5, true], [57.5, 7, true]]);
    expect(exercisePR(day, hist, 'bench-press')).toMatchObject({ kind: 'reps', value: 7, prev: 6 });
    expect(prSetIndex(day, hist, 'bench-press')).toBe(1);
  });
  it('ignores unchecked sets, first-time exercises and exercises outside today’s parts', () => {
    const unchecked = withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[70, 3, false]]);
    expect(prSetIndex(unchecked, hist, 'bench-press')).toBe(-1);
    const first = withSets(togglePart(emptyDay(T), 'chest'), 'incline-db-press', [[30, 8, true]]);
    expect(exercisePR(first, hist, 'incline-db-press')).toBeUndefined();
    const offPart = withSets(emptyDay(T), 'bench-press', [[70, 3, true]]);
    expect(prSetIndex(offPart, hist, 'bench-press')).toBe(-1);
  });
  it('handles bodyweight reps records', () => {
    const h = [withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'push-up', [[null, 15, true]])];
    const day = withSets(togglePart(emptyDay(T), 'chest'), 'push-up', [[null, 12, true], [null, 18, true]]);
    expect(exercisePR(day, h, 'push-up')).toMatchObject({ kind: 'reps', value: 18 });
    expect(prSetIndex(day, h, 'push-up')).toBe(1);
  });
});
