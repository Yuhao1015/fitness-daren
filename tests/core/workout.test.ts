import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { addSet, setCardio, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { exerciseById } from '../../miniprogram/core/catalog';
import {
  canComplete, cardioBurn, dayBurn, dayVolume, doneSetCount, estimateCardioKcal, isDoneDay,
  lastPerformance, recoveryHint, setText, suggestPart, suggestText, trainingMinutes,
} from '../../miniprogram/core/workout';

function benchDay(date: string, w: number, reps: number[], done = true): DayRecord {
  let d = togglePart(emptyDay(date), 'chest');
  reps.forEach((r, i) => {
    d = addSet(d, 'bench-press', { w, r });
    d = updateSet(d, 'bench-press', i, { w, r, done: true }, 0);
  });
  return setDone(d, done, 0);
}

function lookupOf(days: DayRecord[]) {
  const m = new Map(days.map((d) => [d.date, d]));
  return (k: string) => m.get(k);
}

describe('workout metrics', () => {
  it('counts only done sets of planned parts', () => {
    let d = benchDay('2026-10-10', 50, [8, 8]);
    d = addSet(d, 'bench-press', { w: 50, r: 8 }); // 第三组未完成
    expect(doneSetCount(d)).toBe(2);
    expect(dayVolume(d)).toBe(800);
    expect(dayBurn(d, null)).toBe(18);           // 2 组 × 9 kcal
    expect(dayBurn(d, 105)).toBe(27);            // × 105/70
    const removed = togglePart(d, 'chest');
    expect(doneSetCount(removed)).toBe(0);
  });
  it('adds cardio kcal only when cardio is planned', () => {
    let d = setCardio(emptyDay('2026-10-10'), { kcal: 240, mins: 25 });
    expect(cardioBurn(d)).toBe(0);
    d = togglePart(d, 'cardio');
    expect(cardioBurn(d)).toBe(240);
    expect(trainingMinutes(d)).toBe(25);
    expect(canComplete(d)).toBe(true);
    expect(estimateCardioKcal('run', 30, null)).toBe(300);
  });
  it('requires parts for a done day', () => {
    expect(isDoneDay(undefined)).toBe(false);
    expect(isDoneDay(benchDay('2026-10-10', 50, [8]))).toBe(true);
    expect(canComplete(togglePart(emptyDay('2026-10-10'), 'leg'))).toBe(false);
  });
  it('finds the last performance before a date', () => {
    const look = lookupOf([benchDay('2026-10-03', 50, [8, 8]), benchDay('2026-10-07', 52.5, [8, 6])]);
    const last = lastPerformance(look, 'bench-press', '2026-10-10');
    expect(last?.date).toBe('2026-10-07');
    expect(last?.daysAgo).toBe(3);
    expect(setText(last!.set, exerciseById('bench-press')!)).toBe('52.5kg×6');
    expect(lastPerformance(look, 'squat', '2026-10-10')).toBeNull();
  });
  it('formats bodyweight and timed sets', () => {
    expect(setText({ w: null, r: 15, done: true }, exerciseById('push-up')!)).toBe('自重×15');
    expect(setText({ w: null, r: 60, done: true }, exerciseById('plank')!)).toBe('自重×60秒');
  });
  it('suggests the part rested longest, ignoring planned-but-missed days', () => {
    // 昨天练了除胸以外的所有部位
    const yesterday = setDone(
      (['leg', 'arm', 'shoulder', 'back', 'core', 'cardio'] as const).reduce((d, p) => togglePart(d, p), emptyDay('2026-10-09')),
      true,
      0,
    );
    const missedChest = togglePart(emptyDay('2026-10-08'), 'chest'); // 计划了但没完成
    const s = suggestPart(lookupOf([yesterday, missedChest]), '2026-10-10');
    expect(s).toEqual({ part: 'chest', daysAgo: null });
    expect(suggestText(s)).toBe('推荐练「胸」 · 最近没练过');
  });
  it('warns when the same part is planned within 48 hours', () => {
    const look = lookupOf([togglePart(emptyDay('2026-10-09'), 'arm')]);
    expect(recoveryHint(look, '2026-10-10', ['arm'])).toBe('手臂 1 天前刚练过，建议同一部位间隔 48 小时');
    expect(recoveryHint(look, '2026-10-10', ['cardio'])).toBe('');
  });
});
