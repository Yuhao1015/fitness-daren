import { describe, expect, it } from 'vitest';
import { DayRepo, MemoryStorage, ProfileStore } from '../../miniprogram/services/store';
import { SyncEngine, type CloudApi } from '../../miniprogram/services/sync';
import { emptyDay } from '../../miniprogram/core/types';
import { togglePart } from '../../miniprogram/core/day-ops';

function setup(api: CloudApi) {
  const s = new MemoryStorage();
  let now = 1000;
  const repo = new DayRepo(s, () => ++now);
  const profile = new ProfileStore(s);
  return { s, repo, profile, engine: new SyncEngine(repo, profile, s, api) };
}

describe('SyncEngine', () => {
  it('pushes dirty days in batches of 20 and clears them', async () => {
    const calls: unknown[] = [];
    const api: CloudApi = {
      async call<T>(action: string, data?: unknown): Promise<T> {
        calls.push(action);
        if (action === 'days.push') {
          const days = (data as { days: { date: string }[] }).days;
          return { accepted: days.map((d) => d.date), rejected: [] } as T;
        }
        return { days: [], hasMore: false } as T;
      },
    };
    const { repo, engine } = setup(api);
    for (let i = 1; i <= 25; i++) repo.put(emptyDay(`2026-10-${String(i).padStart(2, '0')}`));
    const r = await engine.push();
    expect(r.accepted).toHaveLength(25);
    expect(calls.filter((c) => c === 'days.push')).toHaveLength(2);
    expect(repo.dirtyKeys()).toEqual([]);
  });

  it('keeps a day dirty if it changed while the push was in flight', async () => {
    let repoRef: DayRepo | null = null;
    const api: CloudApi = {
      async call<T>(action: string, data?: unknown): Promise<T> {
        if (action === 'days.push') {
          repoRef!.update('2026-10-10', (d) => togglePart(d, 'chest'));
          const days = (data as { days: { date: string }[] }).days;
          return { accepted: days.map((d) => d.date), rejected: [] } as T;
        }
        return { days: [], hasMore: false } as T;
      },
    };
    const { repo, engine } = setup(api);
    repoRef = repo;
    repo.put(togglePart(emptyDay('2026-10-10'), 'leg'));
    await engine.push();
    expect(repo.dirtyKeys()).toEqual(['2026-10-10']);
  });

  it('pulls pages until hasMore is false and remembers the cursor', async () => {
    const pages = [
      { days: [{ ...togglePart(emptyDay('2026-10-01'), 'leg'), updatedAt: 50, serverAt: 100 }], hasMore: true },
      { days: [{ ...togglePart(emptyDay('2026-10-02'), 'back'), updatedAt: 60, serverAt: 200 }], hasMore: false },
    ];
    const sinceSeen: number[] = [];
    const api: CloudApi = {
      async call<T>(action: string, data?: unknown): Promise<T> {
        if (action === 'days.pull') {
          sinceSeen.push((data as { since: number }).since);
          return pages.shift() as T;
        }
        return { accepted: [], rejected: [] } as T;
      },
    };
    const { s, repo, engine } = setup(api);
    expect(await engine.pull()).toBe(2);
    expect(sinceSeen).toEqual([0, 100]);
    expect(s.get('sync:pulledAt')).toBe(200);
    expect(repo.get('2026-10-02')).not.toHaveProperty('serverAt');
    expect(repo.dirtyKeys()).toEqual([]);
  });

  it('uploads a dirty profile once', async () => {
    const actions: string[] = [];
    const api: CloudApi = {
      async call<T>(action: string): Promise<T> {
        actions.push(action);
        return (action === 'days.pull' ? { days: [], hasMore: false } : { accepted: [], rejected: [], profile: {} }) as T;
      },
    };
    const { profile, engine } = setup(api);
    profile.update({ goal: 'bulk' });
    await engine.sync();
    await engine.sync();
    expect(actions.filter((a) => a === 'users.update')).toHaveLength(1);
  });

  it('shares one in-flight sync between concurrent callers', async () => {
    let pulls = 0;
    const api: CloudApi = {
      async call<T>(action: string): Promise<T> {
        if (action === 'days.pull') pulls++;
        return (action === 'days.pull' ? { days: [], hasMore: false } : { accepted: [], rejected: [] }) as T;
      },
    };
    const { engine } = setup(api);
    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(pulls).toBe(1);
  });
});
