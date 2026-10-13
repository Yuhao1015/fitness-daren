import { describe, expect, it } from 'vitest';
import { createAppContext } from '../../miniprogram/services/app-context';
import { MemoryStorage } from '../../miniprogram/services/store';
import { checkBadges, loadOwned } from '../../miniprogram/services/badges';
import { emptyDay } from '../../miniprogram/core/types';
import { setDone, togglePart } from '../../miniprogram/core/day-ops';

describe('checkBadges', () => {
  it('awards once and survives undo/redo of the same day', () => {
    const ctx = createAppContext(new MemoryStorage(), null, () => new Date(2026, 9, 10, 20).getTime());
    const t = ctx.today();
    ctx.days.put(setDone(togglePart(emptyDay(t), 'leg'), true, 1));
    expect(checkBadges(ctx, 100).map((b) => b.id)).toEqual(['first']);
    ctx.days.update(t, (d) => setDone(d, false, 2));
    ctx.days.update(t, (d) => setDone(d, true, 3));
    expect(checkBadges(ctx, 200)).toEqual([]);
    expect(loadOwned(ctx.storage)).toEqual({ first: 100 });
  });
});
