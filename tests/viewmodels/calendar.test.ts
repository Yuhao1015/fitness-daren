import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { setDone, togglePart } from '../../miniprogram/core/day-ops';
import { buildCalendarVM, selectAfterShift, shiftMonth } from '../../miniprogram/viewmodels/calendar';

const T = '2026-10-10';
function look(days: DayRecord[]) {
  const m = new Map(days.map((d) => [d.date, d]));
  return (k: string) => m.get(k);
}

describe('buildCalendarVM', () => {
  const days = [
    setDone(togglePart(emptyDay('2026-10-08'), 'arm'), true, 0),
    togglePart(emptyDay('2026-10-01'), 'leg'),
    togglePart(emptyDay('2026-10-12'), 'chest'),
  ];
  const base = { today: T, year: 2026, month0: 9, sel: T, lookup: look(days), bodyweightKg: null, infoOpen: null };

  it('renders the four cell states', () => {
    const vm = buildCalendarVM(base);
    const cell = (d: string) => vm.cells.find((c) => c.key === d)!;
    expect(vm.cells.filter((c) => c.blank)).toHaveLength(3);
    expect(cell('2026-10-08').bg).toBe('#2E7D4F');            // 已完成
    expect(cell('2026-10-12').bg).toBe('#EAF5EA');            // 已计划
    expect(cell(T).numBg).toBe('#1E2A22');                     // 今天
    expect(cell(T).ol).toBe('#1E2A22');                        // 选中
    expect(cell('2026-10-01').aria).toBe('10月1日，计划未完成：腿');
    expect(vm.header).toEqual({ over: '训练日历', title: '2026年10月', num: '1', numLabel: '本月完成（天）' });
  });

  it('describes the selected day with a recovery hint', () => {
    const vm = buildCalendarVM({ ...base, sel: '2026-10-09', lookup: look([...days, togglePart(emptyDay('2026-10-09'), 'arm')]) });
    expect(vm.sel.title).toBe('10月9日 · 周五');
    expect(vm.sel.status).toBe('计划未完成');
    expect(vm.sel.hint).toBe('手臂 1 天前刚练过，建议同一部位间隔 48 小时');
    expect(vm.sel.canMark).toBe(true);
    expect(vm.sel.canStart).toBe(false);
  });

  it('lets today start training and plans from today for past selections', () => {
    const vm = buildCalendarVM({ ...base, lookup: look([...days, togglePart(emptyDay(T), 'leg')]) });
    expect(vm.sel.canStart).toBe(true);
    const past = buildCalendarVM({ ...base, sel: '2026-10-01' });
    expect(past.info.tpl.text).toBe('从 10月10日 起排 7 天，已有安排的日子不会被覆盖。点分享可以把计划发给好友，对方一键套用。');
    expect(past.showBack).toBe(true);
    expect(vm.showBack).toBe(false);
  });

  it('counts parts this month', () => {
    const vm = buildCalendarVM(base);
    expect(vm.stats.find((s) => s.key === 'arm')!.count).toBe(1);
    expect(vm.stats.find((s) => s.key === 'leg')!.count).toBe(1);
  });
});

describe('month navigation', () => {
  it('wraps across years', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
    expect(shiftMonth(2027, 0, -1)).toEqual({ year: 2026, month0: 11 });
  });
  it('selects today in the current month and the 1st elsewhere', () => {
    expect(selectAfterShift(T, 2026, 9)).toBe(T);
    expect(selectAfterShift(T, 2027, 1)).toBe('2027-02-01');
  });
});
