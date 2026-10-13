import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../miniprogram/services/store';
import { getPoster, listPosters, savePosterRecord } from '../../miniprogram/services/album';

describe('poster album', () => {
  it('keeps one record per type and day, newest first, capped at 60', () => {
    const s = new MemoryStorage();
    savePosterRecord(s, { id: 'a', type: 'checkin', date: '2026-10-09', title: '打卡 No.031', data: {} });
    savePosterRecord(s, { id: 'b', type: 'checkin', date: '2026-10-10', title: '打卡 No.032', data: {} });
    savePosterRecord(s, { id: 'c', type: 'checkin', date: '2026-10-10', title: '打卡 No.032', data: { v: 2 } });
    expect(listPosters(s).map((p) => p.id)).toEqual(['c', 'a']);
    expect(getPoster(s, 'c')?.data).toEqual({ v: 2 });
    for (let i = 0; i < 70; i++) savePosterRecord(s, { id: 'x' + i, type: 'report', date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, title: 't', data: {} });
    expect(listPosters(s).length).toBeLessThanOrEqual(60);
  });
});
