import { BALANCED_PERSONA, PARTS, PERSONA, partById, type PartId } from './catalog';
import { addDays, startOfWeek, type DayKey } from './date';
import { topPart } from './fun';
import { computeStreak, longestPersist } from './streak';
import type { DayRecord } from './types';
import { isDoneDay } from './workout';

export type TimeSlot = 'morning' | 'noon' | 'night';
export type Rhythm = 'steady' | 'free';
export const PERSONA_UNLOCK = 14;

const TIME_NAME: Record<TimeSlot, string> = { morning: '晨光', noon: '午间', night: '夜行' };
const RHYTHM_NAME: Record<Rhythm, string> = { steady: '规律派', free: '随性派' };
const DESC: Record<TimeSlot, Record<Rhythm, string>> = {
  morning: { steady: '天亮就出门的自律派，计划表是你最好的朋友。', free: '想到就去的清晨行动派，早起的那一刻就赢了。' },
  noon: { steady: '把训练塞进午休的时间管理大师。', free: '见缝插针的午间玩家，哪里有空哪里就是健身房。' },
  night: { steady: '下班后准时报到的夜行者，汗水是一天的句号。', free: '夜色里随性开练的自由派，心情好就多练两组。' },
};

export interface PersonaResult {
  unlocked: boolean;
  progressText: string;
  predicted: boolean;
  time: TimeSlot;
  rhythm: Rhythm;
  part: PartId | null;
  name: string;
  desc: string;
  color: string;
}

export function timeSlotOf(ts: number): TimeSlot {
  const h = new Date(ts).getHours();
  return h < 11 ? 'morning' : h < 17 ? 'noon' : 'night';
}

/** 近 4 周每周次数的标准差 ≤ 1 视为规律 */
export function rhythmOf(weekCounts: number[]): Rhythm {
  if (!weekCounts.length) return 'free';
  const mean = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const sd = Math.sqrt(weekCounts.reduce((a, x) => a + (x - mean) ** 2, 0) / weekCounts.length);
  return sd <= 1 ? 'steady' : 'free';
}

function compose(time: TimeSlot, rhythm: Rhythm, part: PartId | null, predicted: boolean, unlocked: boolean, progressText: string): PersonaResult {
  return {
    unlocked, progressText, predicted, time, rhythm, part,
    name: `${TIME_NAME[time]} · ${RHYTHM_NAME[rhythm]} · ${part ? PERSONA[part] : BALANCED_PERSONA}`,
    desc: DESC[time][rhythm],
    color: part ? partById(part).color : '#2E7D4F',
  };
}

export function computePersona(all: DayRecord[], doneKeys: DayKey[], today: DayKey): PersonaResult {
  const best = Math.max(longestPersist(doneKeys, '2000-01-01', today), computeStreak(doneKeys, today).persistDays);
  const unlocked = best >= PERSONA_UNLOCK;
  const mon = startOfWeek(today);
  const from = addDays(mon, -28);
  const recent = all.filter((d) => d.date >= from && d.date <= today && isDoneDay(d));

  const slots: Record<TimeSlot, number> = { morning: 0, noon: 0, night: 0 };
  recent.forEach((d) => {
    if (d.finishedAt) slots[timeSlotOf(d.finishedAt)]++;
  });
  const time = (['night', 'morning', 'noon'] as TimeSlot[]).reduce((a, b) => (slots[b] > slots[a] ? b : a));

  const weeks = [1, 2, 3, 4].map((w) => {
    const s = addDays(mon, -7 * w);
    const e = addDays(s, 6);
    return recent.filter((d) => d.date >= s && d.date <= e).length;
  });

  const counts = Object.fromEntries(PARTS.map((p) => [p.id, 0])) as Record<PartId, number>;
  recent.forEach((d) => d.parts.forEach((p) => counts[p]++));
  const total = PARTS.reduce((n, p) => n + counts[p.id], 0);
  const top = topPart(counts);
  const part = top && counts[top] / total >= 0.3 ? top : null;

  return compose(time, rhythmOf(weeks), part, false, unlocked, unlocked ? '' : `再坚持 ${PERSONA_UNLOCK - best} 天解锁训练人格`);
}

export const QUIZ: { id: 'time' | 'rhythm' | 'part'; q: string; options: { label: string; value: string }[] }[] = [
  { id: 'time', q: '你通常什么时候练？', options: [{ label: '早上出门前', value: 'morning' }, { label: '午休或下午', value: 'noon' }, { label: '下班后的晚上', value: 'night' }] },
  { id: 'rhythm', q: '你的训练节奏更像？', options: [{ label: '固定几天，雷打不动', value: 'steady' }, { label: '看心情，有空就练', value: 'free' }] },
  { id: 'part', q: '最想练出来的是？', options: [{ label: '腿和臀', value: 'leg' }, { label: '胸和肩', value: 'chest' }, { label: '背和手臂', value: 'back' }, { label: '核心和耐力', value: 'cardio' }] },
];

export function quizPersona(a: { time: TimeSlot; rhythm: Rhythm; part: PartId }): PersonaResult {
  return compose(a.time, a.rhythm, a.part, true, true, '');
}
