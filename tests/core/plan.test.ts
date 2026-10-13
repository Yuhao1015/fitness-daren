import { describe, expect, it } from 'vitest';
import { templateById } from '../../miniprogram/core/catalog';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { togglePart } from '../../miniprogram/core/day-ops';
import { applyTemplate, applyTemplateToast, planStart, weeklyPlan } from '../../miniprogram/core/plan';

const none = () => undefined;

describe('plan', () => {
  it('applies a template for 7 days and skips rest days', () => {
    const r = applyTemplate(none, templateById('ppl'), '2026-10-12');
    expect(r.updates.map((d) => d.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(r.updates[0].parts).toEqual(['chest', 'arm', 'shoulder']);
    expect(applyTemplateToast(templateById('ppl'), r.count)).toBe('「推 / 拉 / 腿」已排入 6 天');
  });
  it('never overwrites planned days', () => {
    const planned: DayRecord = togglePart(emptyDay('2026-10-12'), 'leg');
    const r = applyTemplate((k) => (k === '2026-10-12' ? planned : undefined), templateById('ppl'), '2026-10-12');
    expect(r.updates.find((d) => d.date === '2026-10-12')).toBeUndefined();
    expect(applyTemplateToast(templateById('ppl'), 0)).toBe('这 7 天都已有安排，未覆盖');
  });
  it('never plans in the past', () => {
    expect(planStart('2026-10-01', '2026-10-10')).toBe('2026-10-10');
    expect(planStart('2026-10-20', '2026-10-10')).toBe('2026-10-20');
  });
  it('builds a weekly plan for the onboarding target', () => {
    // 周六：本周三个训练日都已过去，排到下周
    const sat = weeklyPlan(3, '2026-10-10', none);
    expect(sat.map((d) => d.date)).toEqual(['2026-10-12', '2026-10-14', '2026-10-16']);
    expect(sat.map((d) => d.parts)).toEqual([['leg', 'chest', 'back'], ['cardio'], ['leg', 'chest', 'back']]);
    // 周三：只排本周剩下的训练日
    const wed = weeklyPlan(4, '2026-10-07', none);
    expect(wed.map((d) => d.date)).toEqual(['2026-10-08', '2026-10-09']);
    expect(wed[0].parts).toEqual(['chest', 'arm', 'shoulder', 'back']);
  });
});
