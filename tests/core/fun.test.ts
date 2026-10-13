import { describe, expect, it } from 'vitest';
import { energyFun, persona, posterFun, seedOf, topPart, weightFun } from '../../miniprogram/core/fun';

const zero = { leg: 0, chest: 0, arm: 0, shoulder: 0, back: 0, core: 0, cardio: 0 };

describe('fun', () => {
  it('picks a reference that lands between 1 and 20, rotated by seed', () => {
    expect(weightFun(260, 0)).toBe('≈ 2.6 只大熊猫');
    expect(weightFun(260, 1)).toBe('≈ 1.3 只东北虎');
  });
  it('falls back to the smallest or largest reference', () => {
    expect(weightFun(50, 0)).toBe('≈ 0.5 只大熊猫');
    expect(weightFun(9_000_000, 0)).toBe('≈ 60.0 头蓝鲸');
  });
  it('converts energy like the prototype rice bowl', () => {
    expect(energyFun(348, 0)).toBe('≈ 2.0 碗米饭');
  });
  it('builds the poster line', () => {
    expect(posterFun(230, 300, 0)).toBe('今天举起的总重量 ≈ 2.3 只大熊猫');
    expect(posterFun(0, 348, 0)).toBe('今天燃烧的热量 ≈ 2.0 碗米饭');
    expect(posterFun(0, 0, 0)).toBe('');
  });
  it('derives a stable seed from a day key', () => {
    expect(seedOf('2026-10-10')).toBe(20261010);
  });
  it('names a persona when one part dominates', () => {
    expect(persona({ ...zero, leg: 4, chest: 2, core: 2 })).toBe('腿部狂魔');
    expect(persona({ ...zero, leg: 2, chest: 2, back: 2, arm: 2 })).toBe('均衡发展型');
    expect(persona(zero)).toBe('均衡发展型');
    expect(topPart(zero)).toBeNull();
  });
});
