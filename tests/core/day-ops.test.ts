import { describe, expect, it } from 'vitest';
import { emptyDay } from '../../miniprogram/core/types';
import {
  MAX_SETS, addFood, addSet, removeFood, removeLastSet, setCardio, setDone, setsOf, togglePart, updateSet,
} from '../../miniprogram/core/day-ops';

const D = '2026-10-10';

describe('day-ops', () => {
  it('toggles parts in catalog order and clears done when empty', () => {
    let d = togglePart(emptyDay(D), 'core');
    d = togglePart(d, 'chest');
    expect(d.parts).toEqual(['chest', 'core']);
    d = setDone(d, true, 1000);
    expect(d.finishedAt).toBe(1000);
    d = togglePart(togglePart(d, 'chest'), 'core');
    expect(d.parts).toEqual([]);
    expect(d.done).toBe(false);
    expect(d.finishedAt).toBeNull();
  });
  it('keeps the first finish time when completing again', () => {
    const d = setDone(setDone(togglePart(emptyDay(D), 'leg'), true, 1000), true, 2000);
    expect(d.finishedAt).toBe(1000);
  });
  it('adds sets by copying the last one, seeded on the first', () => {
    let d = addSet(emptyDay(D), 'bench-press', { w: 50, r: 8 });
    d = updateSet(d, 'bench-press', 0, { w: 52.5 }, 0);
    d = addSet(d, 'bench-press', { w: 50, r: 8 });
    expect(setsOf(d, 'bench-press')).toEqual([
      { w: 52.5, r: 8, done: false },
      { w: 52.5, r: 8, done: false },
    ]);
  });
  it('caps sets at MAX_SETS and removes the last set', () => {
    let d = emptyDay(D);
    for (let i = 0; i < MAX_SETS + 3; i++) d = addSet(d, 'squat', { w: 60, r: 8 });
    expect(setsOf(d, 'squat')).toHaveLength(MAX_SETS);
    d = removeLastSet(d, 'squat');
    expect(setsOf(d, 'squat')).toHaveLength(MAX_SETS - 1);
  });
  it('stamps the time when a set is marked done', () => {
    let d = addSet(emptyDay(D), 'squat', { w: 60, r: 8 });
    d = updateSet(d, 'squat', 0, { done: true }, 1234);
    expect(setsOf(d, 'squat')[0]).toEqual({ w: 60, r: 8, done: true, at: 1234 });
  });
  it('does not mutate the input', () => {
    const a = addSet(emptyDay(D), 'squat', { w: 60, r: 8 });
    const b = updateSet(a, 'squat', 0, { r: 5 }, 0);
    expect(setsOf(a, 'squat')[0].r).toBe(8);
    expect(setsOf(b, 'squat')[0].r).toBe(5);
  });
  it('patches cardio with defaults', () => {
    const d = setCardio(emptyDay(D), { kcal: 240 });
    expect(d.cardio).toEqual({ type: 'run', mins: null, kcal: 240, source: 'device' });
  });
  it('adds and removes food by id', () => {
    const item = { id: 'f1', title: '煎鸡胸肉 · 150 g', kcal: 245, p: 36, c: 0, f: 10, src: 'calc' as const, at: 1 };
    const d = addFood(emptyDay(D), item);
    expect(d.food).toHaveLength(1);
    expect(removeFood(d, 'f1').food).toHaveLength(0);
  });
});
