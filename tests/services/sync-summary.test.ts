import { describe, expect, it } from 'vitest';
import { DayRepo, MemoryStorage, ProfileStore } from '../../miniprogram/services/store';
import { SyncEngine, type CloudApi } from '../../miniprogram/services/sync';
import { emptyDay } from '../../miniprogram/core/types';

describe('SyncEngine summary', () => {
  it('attaches the summary to the first push batch only', async () => {
    const payloads: Record<string, unknown>[] = [];
    const api: CloudApi = {
      async call<T>(action: string, data?: unknown): Promise<T> {
        if (action === 'days.push') {
          payloads.push(data as Record<string, unknown>);
          const days = (data as { days: { date: string }[] }).days;
          return { accepted: days.map((d) => d.date), rejected: [] } as T;
        }
        return { days: [], hasMore: false } as T;
      },
    };
    const s = new MemoryStorage();
    let now = 1;
    const repo = new DayRepo(s, () => ++now);
    for (let i = 1; i <= 25; i++) repo.put(emptyDay(`2026-10-${String(i).padStart(2, '0')}`));
    const engine = new SyncEngine(repo, new ProfileStore(s), s, api, () => ({ date: '2026-10-25', persistDays: 3 }));
    await engine.push();
    expect(payloads).toHaveLength(2);
    expect(payloads[0].summary).toEqual({ date: '2026-10-25', persistDays: 3 });
    expect(payloads[1]).not.toHaveProperty('summary');
  });
});
