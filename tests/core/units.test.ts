import { describe, expect, it } from 'vitest';
import { pxToRpx } from '../../miniprogram/core/units';

describe('pxToRpx', () => {
  it('maps the 390px prototype canvas onto 750rpx', () => {
    expect(pxToRpx(390)).toBe(750);
  });
  it('rounds common prototype sizes', () => {
    expect(pxToRpx(44)).toBe(85);
    expect(pxToRpx(16)).toBe(31);
    expect(pxToRpx(12)).toBe(23);
    expect(pxToRpx(28)).toBe(54);
    expect(pxToRpx(20)).toBe(38);
  });
});
