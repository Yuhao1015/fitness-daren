import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { DEFAULT_ME_UI, buildMeVM } from '../../miniprogram/viewmodels/me';

const T = '2026-10-10';
function bench(date: string, w: number): DayRecord {
  let d = togglePart(emptyDay(date), 'chest');
  for (let i = 0; i < 3; i++) { d = addSet(d, 'bench-press', { w, r: 8 }); d = updateSet(d, 'bench-press', i, { done: true }, 0); }
  return setDone(d, true, 0);
}
function input(all: DayRecord[], ui = DEFAULT_ME_UI) {
  const m = new Map(all.map((d) => [d.date, d]));
  return { today: T, all, lookup: (k: string) => m.get(k), doneKeys: all.filter((d) => d.done).map((d) => d.date), profile: DEFAULT_PROFILE, ui };
}

describe('buildMeVM', () => {
  it('never shows NaN or empty charts for a brand-new user', () => {
    const vm = buildMeVM(input([]));
    expect(JSON.stringify(vm)).not.toMatch(/NaN|Infinity/);
    expect(vm.heat).toHaveLength(84);
    expect(vm.totalDays).toBe(0);
    expect(vm.weekStreak).toBe(0);
    expect(vm.muscles).toMatchObject({ title: '本周', canNext: false, canPrev: true, empty: true });
    expect(vm.badges).toBeNull();
    expect(vm.prog.unlocked).toBe(false);
    expect(vm.prog.lockText).toBe('再练 2 次「杠铃卧推」解锁进步曲线');
    expect(vm.month.report).toEqual({ unlocked: false, label: '再打卡 8 次解锁月报海报' });
    expect(vm.month.fun[0]).toMatchObject({ value: '0.0 吨', note: '还没有记录' });
    expect(vm.header).toEqual({ over: '我的数据', title: '健身达人', num: '0', numLabel: '已坚持（天）' });
  });

  it('counts weeks in a row that met the weekly target', () => {
    const days = ['2026-09-22', '2026-09-24', '2026-09-26', '2026-09-29', '2026-10-01', '2026-10-03', '2026-10-06'].map((d) => bench(d, 50));
    expect(buildMeVM(input(days)).weekStreak).toBe(2);
  });

  it('colours this week’s muscles on a front and back body map, and pages back through weeks', () => {
    const vm = buildMeVM(input([bench('2026-10-06', 50), bench('2026-09-30', 50)]));
    expect(vm.muscles.empty).toBe(false);
    const svg = Buffer.from(vm.muscles.frontBg.split(',')[1], 'base64').toString('utf8');
    expect(svg).toContain('<g opacity=".4">');
    expect(vm.muscles.aria).toContain('胸');
    const last = buildMeVM(input([bench('2026-10-06', 50), bench('2026-09-30', 50)], { ...DEFAULT_ME_UI, muscleWeek: -1 }));
    expect(last.muscles).toMatchObject({ title: '9月28日–10月4日', canNext: true });
    expect(last.muscles.empty).toBe(false);
    const far = buildMeVM(input([], { ...DEFAULT_ME_UI, muscleWeek: -11 }));
    expect(far.muscles.canPrev).toBe(false);
  });

  it('shows recent badges and the next one on the entry card when badge data is given', () => {
    const vm = buildMeVM({ ...input([]), badges: { stats: { checkins: 1, longestPersist: 1, prCount: 0, volumeKg: 200, dishCount: 0, buddies: 0, challengesDone: 0, pathfinders: 0 }, owned: { first: 5 } } });
    expect(vm.badges!.recent.map((b) => b.key)).toEqual(['first']);
    expect(vm.badges!.next).not.toBeNull();
  });

  it('lays out the heatmap by week columns and Monday-first rows', () => {
    const vm = buildMeVM(input([bench('2026-10-05', 50)]));
    // 行 0（周一）、列 11（本周）就是 10 月 5 日
    expect(vm.heat[0 * 12 + 11].key).toBe('2026-10-05');
    expect(vm.heat[0 * 12 + 11].bg).toBe('#B9DABF');
    expect(vm.heat[6 * 12 + 11].future).toBe(true); // 本周日 10-11 未到
    expect(vm.heatDetail).toBe('10月10日 · 周六 · 今天还没完成训练');
  });

  it('draws the progress curve once there are two sessions', () => {
    const vm = buildMeVM(input([bench('2026-09-20', 50), bench('2026-10-05', 55)]));
    expect(vm.prog.unlocked).toBe(true);
    expect(vm.prog.gain).toBe('+5kg（+10%）');
    expect(vm.prog.points.map((p) => p.x)).toEqual(['0.00', '100.00']);
    expect(vm.prog.grid.map((g) => g.label)).toEqual(['60kg', '52.5kg', '45kg']);
    expect(vm.prog.chartBg.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(vm.prog.tip).toBe('杠铃卧推 · 10月5日 · 55kg × 8');
    const picked = buildMeVM(input([bench('2026-09-20', 50), bench('2026-10-05', 55)], { ...DEFAULT_ME_UI, progSel: '2026-09-20' }));
    expect(picked.prog.tip).toBe('杠铃卧推 · 9月20日 · 50kg × 8');
  });

  it('summarizes this month with persona and unlocks the report at 8 check-ins', () => {
    const days = ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-08', '2026-10-01', '2026-10-03', '2026-10-06', '2026-10-08'].map((d, i) => bench(d, 50 + i));
    const vm = buildMeVM(input(days));
    expect(vm.month.title).toBe('10 月成绩');
    expect(vm.month.fun[2]).toMatchObject({ value: '4 天', note: '本月共 31 天' });
    expect(vm.month.fun[3]).toMatchObject({ value: '胸', note: '胸肌爱好者' });
    expect(vm.month.report.unlocked).toBe(true);
  });
});
