import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppContext } from '../../miniprogram/services/app-context';
import { MemoryStorage } from '../../miniprogram/services/store';
import type { CloudApi } from '../../miniprogram/services/sync';
import { emptyDay } from '../../miniprogram/core/types';

describe('app context', () => {
  afterEach(() => vi.useRealTimers());

  it('works offline without a cloud api', () => {
    const ctx = createAppContext(new MemoryStorage(), null, () => Date.UTC(2026, 9, 10, 4));
    expect(ctx.sync).toBeNull();
    expect(ctx.api).toBeNull();
    expect(() => ctx.syncSoon()).not.toThrow();
    expect(ctx.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('debounces sync calls into one run', async () => {
    vi.useFakeTimers();
    const actions: string[] = [];
    const api: CloudApi = {
      async call<T>(action: string): Promise<T> {
        actions.push(action);
        return (action === 'days.pull' ? { days: [], hasMore: false } : { accepted: [], rejected: [] }) as T;
      },
    };
    const ctx = createAppContext(new MemoryStorage(), api);
    ctx.days.put(emptyDay('2026-10-10'));
    ctx.syncSoon();
    ctx.syncSoon();
    ctx.syncSoon();
    await vi.advanceTimersByTimeAsync(1500);
    expect(actions.filter((a) => a === 'days.pull')).toHaveLength(1);
  });

  it('swallows sync failures and keeps the data dirty for the next try', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const api: CloudApi = { call: async () => { throw new Error('network'); } };
    const ctx = createAppContext(new MemoryStorage(), api);
    ctx.days.put(emptyDay('2026-10-10'));
    ctx.syncSoon();
    await vi.advanceTimersByTimeAsync(1500);
    expect(ctx.days.dirtyKeys()).toEqual(['2026-10-10']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
