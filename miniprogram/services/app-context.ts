import { todayKey, type DayKey } from '../core/date';
import { buildSummary } from '../core/summary';
import { DayRepo, ProfileStore, type StorageAdapter } from './store';
import { SyncEngine, type CloudApi } from './sync';

export interface AppContext {
  storage: StorageAdapter;
  days: DayRepo;
  profile: ProfileStore;
  sync: SyncEngine | null;
  /** 云函数调用；未配置云开发时为 null */
  api: CloudApi | null;
  today(): DayKey;
  syncSoon(): void;
}

const SYNC_DEBOUNCE_MS = 1000;

export function createAppContext(storage: StorageAdapter, api: CloudApi | null, clock: () => number = Date.now): AppContext {
  const days = new DayRepo(storage, clock);
  const profile = new ProfileStore(storage);
  const today = () => todayKey(clock());
  const summarize = () => buildSummary(days.get(today()), days.doneDayKeys(), today(), profile.get().bodyweightKg);
  const sync = api ? new SyncEngine(days, profile, storage, api, summarize) : null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    storage,
    days,
    profile,
    sync,
    api,
    today,
    syncSoon() {
      if (!sync) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        sync.sync().catch((e) => console.warn('[sync] failed, will retry later', e));
      }, SYNC_DEBOUNCE_MS);
    },
  };
}
