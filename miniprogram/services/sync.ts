import type { DayKey } from '../core/date';
import type { DayRecord } from '../core/types';
import type { DayRepo, ProfileStore, StorageAdapter } from './store';

export interface CloudApi {
  call<T = unknown>(action: string, data?: unknown): Promise<T>;
}

interface PushResult {
  accepted: DayKey[];
  rejected: DayKey[];
}

interface PullResult {
  days: Array<DayRecord & { serverAt: number }>;
  hasMore: boolean;
}

export const PUSH_BATCH = 20;
const CURSOR_KEY = 'sync:pulledAt';

export class SyncEngine {
  private running: Promise<void> | null = null;

  constructor(
    private repo: DayRepo,
    private profile: ProfileStore,
    private kv: StorageAdapter,
    private api: CloudApi,
    private summarize: (() => unknown) | null = null,
  ) {}

  async push(): Promise<PushResult> {
    const total: PushResult = { accepted: [], rejected: [] };
    const keys = this.repo.dirtyKeys();
    this.repo.clearDirty(keys.filter((k) => !this.repo.get(k)));
    const present = keys.filter((k) => !!this.repo.get(k));
    for (let i = 0; i < present.length; i += PUSH_BATCH) {
      const batch = present.slice(i, i + PUSH_BATCH).map((k) => this.repo.get(k) as DayRecord);
      const sent = new Map(batch.map((d) => [d.date, d.updatedAt]));
      const payload: Record<string, unknown> = { days: batch };
      if (i === 0 && this.summarize) payload.summary = this.summarize();
      const res = await this.api.call<PushResult>('days.push', payload);
      // 只清掉「发出去之后没再改过」的天
      const settled = [...res.accepted, ...res.rejected].filter((k) => this.repo.get(k)?.updatedAt === sent.get(k));
      this.repo.clearDirty(settled);
      total.accepted.push(...res.accepted);
      total.rejected.push(...res.rejected);
    }
    if (this.profile.isDirty()) {
      await this.api.call('users.update', { profile: this.profile.get() });
      this.profile.clearDirty();
    }
    return total;
  }

  async pull(): Promise<number> {
    let since = this.kv.get<number>(CURSOR_KEY) ?? 0;
    let merged = 0;
    for (let page = 0; page < 50; page++) {
      const res = await this.api.call<PullResult>('days.pull', { since, limit: 100 });
      for (const remote of res.days) {
        const { serverAt, ...day } = remote;
        if (this.repo.mergeRemote(day)) merged++;
        since = Math.max(since, serverAt);
      }
      this.kv.set(CURSOR_KEY, since);
      if (!res.hasMore) break;
    }
    return merged;
  }

  sync(): Promise<void> {
    if (!this.running) {
      this.running = (async () => {
        try {
          await this.push();
          await this.pull();
        } finally {
          this.running = null;
        }
      })();
    }
    return this.running;
  }
}
