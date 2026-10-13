import { describe, expect, it } from 'vitest';
import { headerLayout } from '../../miniprogram/core/layout';

describe('headerLayout', () => {
  it('puts header content 6px below the capsule button', () => {
    const menu = { top: 50, bottom: 82, left: 281, right: 368, width: 87, height: 32 };
    expect(headerLayout(375, 44, menu).paddingTop).toBe(88);
  });
  it('falls back to status bar + 44 when the capsule is unknown', () => {
    expect(headerLayout(375, 47, null).paddingTop).toBe(91);
    expect(headerLayout(375, 20, { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }).paddingTop).toBe(64);
  });
});
