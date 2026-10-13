import { afterEach, describe, expect, it, vi } from 'vitest';
import { DayRepo, MemoryStorage, ProfileStore, WxStorage } from '../../miniprogram/services/store';
import { emptyDay } from '../../miniprogram/core/types';
import { setDone, togglePart } from '../../miniprogram/core/day-ops';

function repo(clock = () => 1000) {
  const s = new MemoryStorage();
  return { s, r: new DayRepo(s, clock) };
}

describe('DayRepo', () => {
  it('stores days in month shards and reads them back', () => {
    const { s, r } = repo();
    r.put(togglePart(emptyDay('2026-10-10'), 'leg'));
    expect(s.get<Record<string, unknown>>('days:2026-10')).toHaveProperty('2026-10-10');
    expect(new DayRepo(s).get('2026-10-10')?.parts).toEqual(['leg']);
  });
  it('queries ranges across a year boundary', () => {
    const { r } = repo();
    for (const k of ['2026-12-30', '2027-01-02', '2027-02-01']) r.put(togglePart(emptyDay(k), 'leg'));
    expect(r.range('2026-12-31', '2027-01-31').map((d) => d.date)).toEqual(['2027-01-02']);
    expect(r.all().map((d) => d.date)).toEqual(['2026-12-30', '2027-01-02', '2027-02-01']);
  });
  it('keeps updatedAt strictly increasing even if the clock stalls or goes back', () => {
    let now = 5000;
    const { r } = repo(() => now);
    const a = r.put(emptyDay('2026-10-10'));
    const b = r.put(togglePart(a, 'leg'));
    now = 4000;
    const c = r.put(togglePart(b, 'chest'));
    expect(b.updatedAt).toBeGreaterThan(a.updatedAt);
    expect(c.updatedAt).toBeGreaterThan(b.updatedAt);
  });
  it('marks local writes dirty but not remote merges', () => {
    const { r } = repo();
    r.put(emptyDay('2026-10-10'));
    expect(r.dirtyKeys()).toEqual(['2026-10-10']);
    r.clearDirty(['2026-10-10']);
    expect(r.mergeRemote({ ...togglePart(emptyDay('2026-10-11'), 'leg'), updatedAt: 9 })).toBe(true);
    expect(r.dirtyKeys()).toEqual([]);
  });
  it('lets the newer side win on merge', () => {
    const { r } = repo(() => 2000);
    r.put(togglePart(emptyDay('2026-10-10'), 'leg'));
    expect(r.mergeRemote({ ...emptyDay('2026-10-10'), updatedAt: 1500 })).toBe(false);
    expect(r.get('2026-10-10')?.parts).toEqual(['leg']);
    expect(r.mergeRemote({ ...emptyDay('2026-10-10'), updatedAt: 9000 })).toBe(true);
    expect(r.get('2026-10-10')?.parts).toEqual([]);
  });
  it('lists done days and notifies subscribers', () => {
    const { r } = repo();
    const seen: string[][] = [];
    const off = r.subscribe((k) => seen.push(k));
    r.put(setDone(togglePart(emptyDay('2026-10-09'), 'leg'), true, 1));
    r.putMany([togglePart(emptyDay('2026-10-12'), 'chest'), togglePart(emptyDay('2026-10-14'), 'back')]);
    off();
    r.put(emptyDay('2026-10-20'));
    expect(r.doneDayKeys()).toEqual(['2026-10-09']);
    expect(seen).toEqual([['2026-10-09'], ['2026-10-12', '2026-10-14']]);
  });
});

describe('ProfileStore', () => {
  it('merges defaults, tracks dirty and respects local edits over remote', () => {
    const p = new ProfileStore(new MemoryStorage());
    expect(p.get()).toMatchObject({ goal: 'maintain', weeklyTarget: 3, bodyweightKg: null, shareDetailToBuddies: false });
    p.update({ bodyweightKg: 72 });
    expect(p.isDirty()).toBe(true);
    p.replaceFromRemote({ bodyweightKg: 60 });
    expect(p.get().bodyweightKg).toBe(72);
    p.clearDirty();
    p.replaceFromRemote({ bodyweightKg: 60 });
    expect(p.get().bodyweightKg).toBe(60);
  });
});

describe('WxStorage', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('never throws when storage is full', () => {
    vi.stubGlobal('wx', {
      setStorageSync: () => { throw new Error('setStorage:fail exceed storage max size 10MB'); },
      getStorageSync: () => '',
      removeStorageSync: () => undefined,
    });
    const s = new WxStorage();
    expect(() => s.set('k', { a: 1 })).not.toThrow();
    expect(s.get('k')).toBeUndefined();
  });
});
