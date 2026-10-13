import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { checkinPosterData, monthHeat, reportPosterData } from '../../miniprogram/viewmodels/poster';

const T = '2026-10-10';
function bench(date: string, w: number, done = true): DayRecord {
  let d = togglePart(togglePart(emptyDay(date), 'chest'), 'core');
  for (let i = 0; i < 3; i++) { d = addSet(d, 'bench-press', { w, r: 8 }); d = updateSet(d, 'bench-press', i, { done: true }, 0); }
  return setDone(d, done, 0);
}
function input(all: DayRecord[]) {
  const m = new Map(all.map((d) => [d.date, d]));
  return { today: T, lookup: (k: string) => m.get(k), all, doneKeys: all.filter((d) => d.done).map((d) => d.date), profile: { ...DEFAULT_PROFILE, bodyweightKg: 88 } };
}

describe('poster data', () => {
  it('fills the check-in poster from today', () => {
    const all = [bench('2026-10-07', 50), bench(T, 55)];
    const d = checkinPosterData(input(all), '/tmp/qr.png');
    expect(d.date).toBe('2026.10.10 周六');
    expect(d.persistDays).toBe(4);
    expect(d.serial).toBe('No.002');
    expect(d.parts.map((p) => p.icon)).toEqual(['/assets/icons/part-chest-white.png', '/assets/icons/part-core-white.png']);
    expect(d.volume).toBe(1320);
    expect(d.pr).toBe('新纪录 · 杠铃卧推 55kg（之前最高 50kg）');
    expect(d.fun.startsWith('今天举起的总重量 ≈')).toBe(true);
    expect(JSON.stringify(d)).not.toContain('88');
  });
  it('marks done, planned-future and today cells in the month heat', () => {
    const all = [bench('2026-10-07', 50), togglePart(emptyDay('2026-10-12'), 'leg')];
    const heat = monthHeat(T, input(all).lookup);
    expect(heat.slice(0, 3).every((h) => h.bg === 'transparent')).toBe(true);
    expect(heat[3 + 6].bg).toBe('#2E7D4F');   // 10-07
    expect(heat[3 + 11].bg).toBe('#EAF5EA');  // 10-12 已计划
    expect(heat[3 + 9].ring).toBe('#1E2A22'); // 今天
  });
  it('builds the monthly report', () => {
    const all = [bench('2026-09-20', 50), bench('2026-10-03', 55), bench('2026-10-07', 55)];
    const r = reportPosterData(input(all), null);
    expect(r.title).toBe('10 月训练报告');
    expect(r.days).toBe(2);
    expect(r.prs).toBe(1);
    expect(r.dist.map((x) => [x.name, x.count, x.pct])).toEqual([['胸', 2, 100], ['腹', 2, 100]]);
    expect(r.persona).toBe('胸肌爱好者');
    expect(r.weekStreak).toBe(0);
  });
});
