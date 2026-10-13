import { describe, expect, it } from 'vitest';
import { IDLE, adjustRest, fmtClock, remaining, startRest, stepReps, stepWeight } from '../../miniprogram/core/timer';

describe('rest timer', () => {
  it('counts down from an end timestamp so background time is not lost', () => {
    const t = startRest(1_000, 90);
    expect(remaining(t, 1_000)).toBe(90);
    expect(remaining(t, 31_500)).toBe(60);
    expect(remaining(t, 200_000)).toBe(0);
    expect(remaining(IDLE, 0)).toBe(0);
  });
  it('adjusts by ±15 s and stops at zero', () => {
    const t = startRest(0, 90);
    expect(remaining(adjustRest(t, 0, 15), 0)).toBe(105);
    expect(adjustRest(t, 80_000, -15)).toEqual(IDLE);
    expect(adjustRest(IDLE, 0, 15)).toEqual(IDLE);
  });
  it('formats clock and steps values', () => {
    expect(fmtClock(125)).toBe('2:05');
    expect(fmtClock(0)).toBe('0:00');
    expect(stepWeight(52.5, 2.5)).toBe(55);
    expect(stepWeight(2.5, -2.5)).toBeNull();
    expect(stepWeight(null, 2.5)).toBe(2.5);
    expect(stepReps(0, -1)).toBe(0);
  });
});
