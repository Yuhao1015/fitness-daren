import type { DayKey } from './date';
import { CROPS, drawable, type Crop, type MuscleId, type MuscleView } from './muscle';
import type { DayRecord } from './types';
import { activeLogs, isDoneDay } from './workout';

/**
 * 每个动作练到的肌群：main = 主要发力，assist = 协同。
 * 「本周肌群」里主要肌群每组算 1 组、协同算半组；专注模式的小人形只高亮主要肌群。
 */
export const EXERCISE_MUSCLES: Record<string, { main: MuscleId[]; assist: MuscleId[] }> = {
  squat: { main: ['quad', 'glute'], assist: ['ham', 'lowback'] },
  'leg-press': { main: ['quad', 'glute'], assist: ['ham'] },
  lunge: { main: ['quad', 'glute'], assist: ['ham', 'calf'] },
  'leg-curl': { main: ['ham'], assist: ['calf'] },
  'bench-press': { main: ['pec'], assist: ['triceps', 'delt'] },
  'incline-db-press': { main: ['pec', 'delt'], assist: ['triceps'] },
  'db-fly': { main: ['pec'], assist: ['delt'] },
  'push-up': { main: ['pec'], assist: ['triceps', 'delt', 'abs'] },
  'barbell-curl': { main: ['biceps'], assist: ['forearm'] },
  'hammer-curl': { main: ['biceps', 'forearm'], assist: [] },
  pushdown: { main: ['triceps'], assist: [] },
  'close-grip-bench': { main: ['triceps', 'pec'], assist: ['delt'] },
  'db-shoulder-press': { main: ['delt'], assist: ['triceps', 'trap'] },
  'lateral-raise': { main: ['delt'], assist: ['trap'] },
  'face-pull': { main: ['delt', 'trap'], assist: [] },
  'arnold-press': { main: ['delt'], assist: ['triceps'] },
  deadlift: { main: ['lowback', 'glute', 'ham'], assist: ['trap', 'lat', 'forearm', 'quad'] },
  'pull-up': { main: ['lat'], assist: ['biceps', 'forearm', 'trap'] },
  'barbell-row': { main: ['lat', 'trap'], assist: ['biceps', 'lowback', 'delt'] },
  'lat-pulldown': { main: ['lat'], assist: ['biceps', 'trap'] },
  'hanging-leg-raise': { main: ['abs'], assist: ['oblique', 'forearm'] },
  crunch: { main: ['abs'], assist: ['oblique'] },
  plank: { main: ['abs'], assist: ['oblique', 'lowback', 'delt'] },
  'russian-twist': { main: ['oblique'], assist: ['abs'] },
};

const LOWER: MuscleId[] = ['quad', 'ham', 'calf', 'glute'];
const ARMS: MuscleId[] = ['biceps', 'triceps', 'forearm'];
const CORE: MuscleId[] = ['abs', 'oblique'];

/**
 * 专注模式里的小人形：选能看到更多主要肌群的那一面（一样多时看第一块主要肌群），
 * 只高亮这一面看得见的主要肌群，再按肌群选取景（手臂 / 腹 / 腿 / 后链 / 躯干）。
 */
export function exerciseFigure(exId: string): { view: MuscleView; highlight: MuscleId[]; crop: Crop } {
  const main = (EXERCISE_MUSCLES[exId] ?? { main: ['pec'] as MuscleId[] }).main;
  const front = main.filter((m) => drawable('front', m)).length;
  const back = main.filter((m) => drawable('back', m)).length;
  const view: MuscleView = front > back ? 'front' : back > front ? 'back' : drawable('front', main[0]) ? 'front' : 'back';
  const highlight = main.filter((m) => drawable(view, m));
  const all = (set: MuscleId[]) => highlight.every((m) => set.includes(m));
  const crop = all(ARMS) ? CROPS.arms
    : all(CORE) ? CROPS.core
    : all(LOWER) ? CROPS.legs
    : highlight.includes('lowback') && highlight.some((m) => m === 'glute' || m === 'ham') ? CROPS.posterior
    : CROPS.torso;
  return { view, highlight, crop };
}

/** 窗口 [from, to] 内已完成训练日的每块肌肉组数：主要肌群每组 1，协同每组 0.5 */
export function weeklyMuscleSets(days: DayRecord[], from: DayKey, to: DayKey): Partial<Record<MuscleId, number>> {
  const out: Partial<Record<MuscleId, number>> = {};
  const add = (m: MuscleId, n: number) => (out[m] = (out[m] ?? 0) + n);
  for (const d of days) {
    if (d.date < from || d.date > to || !isDoneDay(d)) continue;
    for (const log of activeLogs(d)) {
      const n = log.sets.filter((s) => s.done).length;
      const m = EXERCISE_MUSCLES[log.exId];
      if (!n || !m) continue;
      m.main.forEach((x) => add(x, n));
      m.assist.forEach((x) => add(x, n / 2));
    }
  }
  return out;
}

/** 组数 → 3 档：1–4.5 组 / 5–9.5 组 / 10 组以上（每周每肌群 10 组左右是常见的推荐量） */
export function muscleLevel(sets: number): number {
  if (sets <= 0) return 0;
  if (sets < 5) return 1;
  if (sets < 10) return 2;
  return 3;
}
