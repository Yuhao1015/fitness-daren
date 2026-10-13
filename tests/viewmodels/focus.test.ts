import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { MAX_SETS, addSet, completeNextSet, ensurePart, setsOf, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { IDLE, startRest } from '../../miniprogram/core/timer';
import { buildFocusVM, initialDraft } from '../../miniprogram/viewmodels/focus';

const T = '2026-10-10';
function sets(d: DayRecord, exId: string, list: Array<[number | null, number, boolean]>) {
  list.forEach(([w, r, done], i) => { d = addSet(d, exId, { w, r }); d = updateSet(d, exId, i, { w, r, done }, 0); });
  return d;
}

describe('completeNextSet', () => {
  it('fills the first unfinished set, else appends', () => {
    let d = sets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[50, 8, true], [50, 8, false]]);
    d = completeNextSet(d, 'bench-press', { w: 52.5, r: 6 }, 9);
    expect(setsOf(d, 'bench-press')[1]).toEqual({ w: 52.5, r: 6, done: true, at: 9 });
    d = completeNextSet(d, 'bench-press', { w: 52.5, r: 5 }, 10);
    expect(setsOf(d, 'bench-press')).toHaveLength(3);
  });
  it('stops at MAX_SETS', () => {
    let d = togglePart(emptyDay(T), 'chest');
    for (let i = 0; i < MAX_SETS + 2; i++) d = completeNextSet(d, 'bench-press', { w: 50, r: 8 }, i);
    expect(setsOf(d, 'bench-press')).toHaveLength(MAX_SETS);
  });
  it('adds the part when entering focus from elsewhere', () => {
    expect(ensurePart(emptyDay(T), 'leg').parts).toEqual(['leg']);
  });
});

describe('buildFocusVM', () => {
  const lastDay = sets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[50, 8, true], [50, 8, true]]);
  const lookup = (k: string) => (k === '2026-10-07' ? lastDay : undefined);

  it('prefills from the last session and suggests +2.5 kg after a clean session', () => {
    const day = togglePart(emptyDay(T), 'chest');
    const draft = initialDraft(day, 'bench-press', lookup, T);
    expect(draft).toEqual({ w: 50, r: 8 });
    const vm = buildFocusVM({ today: T, day, exId: 'bench-press', lookup, draft, timer: IDLE, now: 0 });
    expect(vm.name).toBe('杠铃卧推');
    expect(vm.figure).toBe('ex-bench-press');
    expect(vm.lastText).toBe('上次 50kg×8');
    expect(vm.completeLabel).toBe('完成第 1 组');
    expect(vm.overload).toEqual({ show: true, label: '+2.5kg 试试', w: 52.5 });
    expect(vm.resting).toBe(false);
  });
  it('shows the rest countdown', () => {
    const day = sets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[50, 8, true]]);
    const vm = buildFocusVM({ today: T, day, exId: 'bench-press', lookup, draft: { w: 50, r: 8 }, timer: startRest(0, 120), now: 30_000 });
    expect(vm.resting).toBe(true);
    expect(vm.restText).toBe('1:30');
    expect(vm.restPct).toBe(75);
    expect(vm.completeLabel).toBe('完成第 2 组');
    expect(vm.dots).toEqual([{ key: '0', done: true }]);
  });
  it('shows a trophy line as soon as a finished set breaks the record', () => {
    const day = sets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[50, 8, true], [55, 5, true]]);
    const vm = buildFocusVM({ today: T, day, exId: 'bench-press', lookup, draft: { w: 55, r: 5 }, timer: IDLE, now: 0, history: [lastDay] });
    expect(vm.prText).toBe('55kg');
    const reps = sets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[50, 10, true]]);
    expect(buildFocusVM({ today: T, day: reps, exId: 'bench-press', lookup, draft: { w: 50, r: 10 }, timer: IDLE, now: 0, history: [lastDay] }).prText).toBe('50kg×10');
    expect(buildFocusVM({ today: T, day, exId: 'bench-press', lookup, draft: { w: 55, r: 5 }, timer: IDLE, now: 0 }).prText).toBe('');
  });

  it('uses seconds for timed holds and hides overload for bodyweight moves', () => {
    const day = togglePart(emptyDay(T), 'core');
    const vm = buildFocusVM({ today: T, day, exId: 'plank', lookup: () => undefined, draft: initialDraft(day, 'plank', () => undefined, T), timer: IDLE, now: 0 });
    expect(vm.wText).toBe('自重');
    expect(vm.rUnit).toBe('秒');
    expect(vm.rText).toBe('60');
    expect(vm.overload.show).toBe(false);
    expect(vm.canUseLast).toBe(false);
  });
});
