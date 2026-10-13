import { describe, expect, it } from 'vitest';
import { emptyDay } from '../../miniprogram/core/types';
import { addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { buildSummary } from '../../miniprogram/core/summary';

describe('buildSummary', () => {
  it('reports parts and burn only for a finished day', () => {
    let d = togglePart(emptyDay('2026-10-10'), 'chest');
    d = addSet(d, 'bench-press', { w: 50, r: 8 });
    d = updateSet(d, 'bench-press', 0, { done: true }, 0);
    expect(buildSummary(d, [], '2026-10-10', null)).toEqual({ date: '2026-10-10', persistDays: 0, parts: [], burn: 0, volume: 0 });
    const done = setDone(d, true, 0);
    expect(buildSummary(done, ['2026-10-10'], '2026-10-10', null)).toEqual({ date: '2026-10-10', persistDays: 1, parts: ['chest'], burn: 9, volume: 400 });
    expect(buildSummary(undefined, [], '2026-10-10', null).parts).toEqual([]);
  });
});
