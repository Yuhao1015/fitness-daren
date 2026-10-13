import { monthOf, type DayKey } from '../core/date';
import { emptyDay, type DayRecord, type Profile } from '../core/types';
import { isDoneDay } from '../core/workout';

export interface StorageAdapter {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

/** 测试与降级用：按 JSON 序列化存储，能暴露不可序列化的数据 */
export class MemoryStorage implements StorageAdapter {
  private m = new Map<string, string>();
  get<T>(key: string): T | undefined {
    const v = this.m.get(key);
    return v === undefined ? undefined : (JSON.parse(v) as T);
  }
  set<T>(key: string, value: T): void {
    this.m.set(key, JSON.stringify(value));
  }
  remove(key: string): void {
    this.m.delete(key);
  }
}

export class WxStorage implements StorageAdapter {
  get<T>(key: string): T | undefined {
    try {
      const v = wx.getStorageSync(key);
      return v === '' || v === undefined || v === null ? undefined : (v as T);
    } catch (e) {
      console.warn('[storage] get failed', key, e);
      return undefined;
    }
  }
  set<T>(key: string, value: T): void {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('[storage] set failed', key, e);
    }
  }
  remove(key: string): void {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.warn('[storage] remove failed', key, e);
    }
  }
}

const INDEX_KEY = 'days:index';
const DIRTY_KEY = 'sync:dirty';
type Shard = Record<DayKey, DayRecord>;

export class DayRepo {
  private shards = new Map<string, Shard>();
  private listeners = new Set<(changed: DayKey[]) => void>();

  constructor(private s: StorageAdapter, private clock: () => number = Date.now) {}

  lookup = (k: DayKey): DayRecord | undefined => this.get(k);

  private shard(month: string): Shard {
    let sh = this.shards.get(month);
    if (!sh) {
      sh = this.s.get<Shard>('days:' + month) ?? {};
      this.shards.set(month, sh);
    }
    return sh;
  }

  private months(): string[] {
    return this.s.get<string[]>(INDEX_KEY) ?? [];
  }

  private write(day: DayRecord): void {
    const month = monthOf(day.date);
    const sh = this.shard(month);
    sh[day.date] = day;
    this.s.set('days:' + month, sh);
    const idx = this.months();
    if (!idx.includes(month)) {
      idx.push(month);
      idx.sort();
      this.s.set(INDEX_KEY, idx);
    }
  }

  private markDirty(keys: DayKey[]): void {
    const set = new Set(this.dirtyKeys());
    keys.forEach((k) => set.add(k));
    this.s.set(DIRTY_KEY, Array.from(set).sort());
  }

  private emit(keys: DayKey[]): void {
    this.listeners.forEach((fn) => fn(keys));
  }

  private stamp(day: DayRecord): DayRecord {
    const prev = this.get(day.date)?.updatedAt ?? 0;
    return { ...day, updatedAt: Math.max(this.clock(), prev + 1) };
  }

  get(k: DayKey): DayRecord | undefined {
    return this.shard(monthOf(k))[k];
  }

  getOrEmpty(k: DayKey): DayRecord {
    return this.get(k) ?? emptyDay(k);
  }

  put(day: DayRecord): DayRecord {
    const rec = this.stamp(day);
    this.write(rec);
    this.markDirty([rec.date]);
    this.emit([rec.date]);
    return rec;
  }

  putMany(days: DayRecord[]): void {
    if (!days.length) return;
    days.forEach((d) => this.write(this.stamp(d)));
    const keys = days.map((d) => d.date);
    this.markDirty(keys);
    this.emit(keys);
  }

  update(k: DayKey, fn: (d: DayRecord) => DayRecord): DayRecord {
    return this.put(fn(this.getOrEmpty(k)));
  }

  /** 云端数据合并：更新的一方胜出；不标记为待上传 */
  mergeRemote(day: DayRecord): boolean {
    const local = this.get(day.date);
    if (local && local.updatedAt >= day.updatedAt) return false;
    this.write(day);
    this.emit([day.date]);
    return true;
  }

  range(from: DayKey, to: DayKey): DayRecord[] {
    const out: DayRecord[] = [];
    for (const m of this.months()) {
      if (m < monthOf(from) || m > monthOf(to)) continue;
      for (const d of Object.values(this.shard(m))) if (d.date >= from && d.date <= to) out.push(d);
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  all(): DayRecord[] {
    const out: DayRecord[] = [];
    for (const m of this.months()) out.push(...Object.values(this.shard(m)));
    return out.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  doneDayKeys(): DayKey[] {
    return this.all().filter((d) => isDoneDay(d)).map((d) => d.date);
  }

  dirtyKeys(): DayKey[] {
    return this.s.get<DayKey[]>(DIRTY_KEY) ?? [];
  }

  clearDirty(keys: DayKey[]): void {
    if (!keys.length) return;
    const rm = new Set(keys);
    this.s.set(DIRTY_KEY, this.dirtyKeys().filter((k) => !rm.has(k)));
  }

  subscribe(fn: (changed: DayKey[]) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const DEFAULT_PROFILE: Profile = {
  goal: 'maintain',
  weeklyTarget: 3,
  bodyweightKg: null,
  nickname: null,
  avatarUrl: null,
  shareDetailToBuddies: false,
  onboardedAt: null,
};

export class ProfileStore {
  constructor(private s: StorageAdapter) {}

  get(): Profile {
    return { ...DEFAULT_PROFILE, ...(this.s.get<Partial<Profile>>('profile') ?? {}) };
  }

  update(patch: Partial<Profile>): Profile {
    const next = { ...this.get(), ...patch };
    this.s.set('profile', next);
    this.s.set('profile:dirty', true);
    return next;
  }

  isDirty(): boolean {
    return this.s.get<boolean>('profile:dirty') === true;
  }

  clearDirty(): void {
    this.s.remove('profile:dirty');
  }

  /** 本地有未上传的修改时，以本地为准 */
  replaceFromRemote(p: Partial<Profile>): void {
    if (this.isDirty()) return;
    this.s.set('profile', { ...this.get(), ...p });
  }
}
