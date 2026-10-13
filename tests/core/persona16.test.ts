import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord } from '../../miniprogram/core/types';
import { setDone, togglePart } from '../../miniprogram/core/day-ops';
import { addDays } from '../../miniprogram/core/date';
import { PERSONA_UNLOCK, computePersona, quizPersona, rhythmOf, timeSlotOf } from '../../miniprogram/core/persona16';

const at = (k: string, h: number) => new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8)), h).getTime();

describe('persona', () => {
  it('maps time of day and rhythm', () => {
    expect(timeSlotOf(at('2026-10-10', 7))).toBe('morning');
    expect(timeSlotOf(at('2026-10-10', 13))).toBe('noon');
    expect(timeSlotOf(at('2026-10-10', 20))).toBe('night');
    expect(rhythmOf([3, 3, 3, 3])).toBe('steady');
    expect(rhythmOf([0, 5, 1, 4])).toBe('free');
  });
  it('unlocks after a 14-day chain and reads the real habits', () => {
    const days: DayRecord[] = [];
    // 5 周、每周一三五晚上练胸
    for (let k = '2026-09-07'; k <= '2026-10-10'; k = addDays(k, 1)) {
      const wd = new Date(at(k, 12)).getDay();
      if (wd === 1 || wd === 3 || wd === 5) days.push(setDone(togglePart(emptyDay(k), 'chest'), true, at(k, 20)));
    }
    const p = computePersona(days, days.map((d) => d.date), '2026-10-10');
    expect(p.unlocked).toBe(true);
    expect(p.name).toBe('夜行 · 规律派 · 胸肌爱好者');
    expect(p.color).toBe('#E07B39');
  });
  it('shows progress before unlocking', () => {
    const d = [setDone(togglePart(emptyDay('2026-10-10'), 'leg'), true, at('2026-10-10', 8))];
    const p = computePersona(d, ['2026-10-10'], '2026-10-10');
    expect(p.unlocked).toBe(false);
    expect(p.progressText).toBe(`再坚持 ${PERSONA_UNLOCK - 1} 天解锁训练人格`);
  });
  it('predicts from the quiz', () => {
    expect(quizPersona({ time: 'morning', rhythm: 'steady', part: 'leg' })).toMatchObject({ predicted: true, unlocked: true, name: '晨光 · 规律派 · 腿部狂魔' });
  });
});
