import { badgeEntryVM, type BadgeStats } from '../core/badges';
import { PARTS, PROGRESS_LIFTS, exerciseById, partById, type PartId } from '../core/catalog';
import { addDays, daysInMonth, diffDays, keyOf, mdText, startOfWeek, weekdayText, type DayKey } from '../core/date';
import { energyFun, persona, seedOf, topPart, weightFun } from '../core/fun';
import { liftIcon } from '../core/icons';
import { bodyMapSvg, type MuscleId } from '../core/muscle';
import { muscleLevel, weeklyMuscleSets } from '../core/muscle-map';
import { progressSeries, type ProgressPoint } from '../core/records';
import { computeStreak, longestPersist, totalCheckins, weeklyStreak } from '../core/streak';
import { svgUri } from '../core/svg';
import type { DayLookup, DayRecord, Profile } from '../core/types';
import { pxToRpx } from '../core/units';
import { dayBurn, dayVolume, fmtKg, isDoneDay } from '../core/workout';
import { C, INFO_TEXT, chip, info, type ChipVM, type InfoVM } from './common';

export const REPORT_UNLOCK = 8;

export interface MeUI {
  heatSel: DayKey | null;
  prog: string;
  progSel: DayKey | null;
  infoOpen: string | null;
  /** 本周肌群图看的是哪一周：0 = 本周，-1 = 上周……最多往回 11 周 */
  muscleWeek: number;
}

export const DEFAULT_ME_UI: MeUI = { heatSel: null, prog: 'bench-press', progSel: null, infoOpen: null, muscleWeek: 0 };
export const MUSCLE_WEEKS_BACK = 11;

const MUSCLE_NAMES: Record<MuscleId, string> = {
  pec: '胸', delt: '肩', biceps: '二头', triceps: '三头', forearm: '前臂', abs: '腹', oblique: '腹斜',
  quad: '大腿前侧', calf: '小腿', trap: '斜方', lat: '背阔', lowback: '下背', glute: '臀', ham: '大腿后侧',
};

export interface MeInput {
  today: DayKey;
  all: DayRecord[];
  lookup: DayLookup;
  doneKeys: DayKey[];
  profile: Profile;
  ui: MeUI;
  /** 徽章入口卡要的数据（页面从存储里读）；不给就不显示最近徽章 */
  badges?: { stats: BadgeStats; owned: Record<string, number> };
}

export interface MusclesVM {
  title: string; frontBg: string; backBg: string; canPrev: boolean; canNext: boolean; aria: string; empty: boolean;
}

export interface HeatCellVM { key: string; future: boolean; bg: string; bd: string; ol: string; aria: string }

export interface CurveVM {
  unlocked: boolean; lockText: string; chips: ChipVM[]; tip: string; gain: string; chartBg: string;
  grid: { key: string; label: string; top: string }[];
  points: { key: string; date: string; x: string; y: string; size: number; fill: string; aria: string }[];
  lastX: string; lastY: string; lastLabel: string; xStart: string; xEnd: string;
}

export interface MeVM {
  header: { over: string; title: string; num: string; numLabel: string };
  heat: HeatCellVM[];
  heatDetail: string;
  totalDays: number;
  longest: number;
  /** 连续达标周数（每周训练天数 ≥ 每周目标） */
  weekStreak: number;
  muscles: MusclesVM;
  badges: ReturnType<typeof badgeEntryVM> | null;
  prog: CurveVM;
  month: { title: string; fun: { key: string; label: string; value: string; note: string }[]; report: { unlocked: boolean; label: string } };
  info: { prog: InfoVM };
}

/** 本周肌群：正面、背面两个人形，按这一周每块肌肉的完成组数分 3 档着色 */
function musclesVM(i: MeInput): MusclesVM {
  const off = Math.max(-MUSCLE_WEEKS_BACK, Math.min(0, i.ui.muscleWeek));
  const mon = addDays(startOfWeek(i.today), off * 7);
  const sun = addDays(mon, 6);
  const sets = weeklyMuscleSets(i.all, mon, sun > i.today ? i.today : sun);
  const levels: Partial<Record<MuscleId, number>> = {};
  (Object.keys(sets) as MuscleId[]).forEach((m) => (levels[m] = muscleLevel(sets[m] ?? 0)));
  const trained = (Object.keys(sets) as MuscleId[]).filter((m) => (sets[m] ?? 0) > 0).sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0));
  const title = off === 0 ? '本周' : `${mdText(mon)}–${mdText(sun)}`;
  return {
    title,
    frontBg: svgUri(bodyMapSvg('front', levels, C.GREEN)),
    backBg: svgUri(bodyMapSvg('back', levels, C.GREEN)),
    canPrev: off > -MUSCLE_WEEKS_BACK,
    canNext: off < 0,
    empty: trained.length === 0,
    aria: title + (trained.length ? '练到：' + trained.map((m) => `${MUSCLE_NAMES[m]} ${fmtKg(sets[m] ?? 0)} 组`).join('、') : '还没有训练'),
  };
}

function partNames(d?: DayRecord): string {
  return d ? d.parts.map((p) => partById(p).name).join(' + ') : '';
}

function curve(series: ProgressPoint[], name: string, sel: DayKey | null, chips: ChipVM[]): CurveVM {
  const empty: CurveVM = {
    unlocked: false, lockText: `再练 ${Math.max(0, 2 - series.length)} 次「${name}」解锁进步曲线`, chips, tip: '', gain: '', chartBg: '',
    grid: [], points: [], lastX: '0', lastY: '0', lastLabel: '', xStart: '', xEnd: '',
  };
  if (series.length < 2) return empty;
  const ws = series.map((s) => s.w);
  const lo = Math.floor((Math.min(...ws) - 2.5) / 5) * 5;
  const hi = Math.ceil((Math.max(...ws) + 2.5) / 5) * 5;
  const first = series[0];
  const last = series[series.length - 1];
  const span = diffDays(last.date, first.date);
  const px = (k: DayKey) => (span === 0 ? 50 : (diffDays(k, first.date) / span) * 100);
  const py = (w: number) => (1 - (w - lo) / (hi - lo)) * 100;
  let selIdx = series.length - 1;
  series.forEach((s, i) => { if (s.date === sel) selIdx = i; });
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${px(s.date).toFixed(2)} ${py(s.w).toFixed(2)}`).join(' ');
  const area = line + ' L100 100 L0 100 Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${area}" fill="rgba(46,125,79,0.10)"/><path d="${line}" fill="none" stroke="#2E7D4F" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  const sx = series[selIdx];
  const diff = last.w - first.w;
  const sign = diff >= 0 ? '+' : '';
  return {
    unlocked: true, lockText: '', chips,
    tip: `${name} · ${mdText(sx.date)} · ${fmtKg(sx.w)}kg × ${sx.r}`,
    gain: `${sign}${fmtKg(diff)}kg` + (first.w ? `（${sign}${Math.round((diff / first.w) * 100)}%）` : ''),
    chartBg: svgUri(svg),
    grid: [hi, (hi + lo) / 2, lo].map((v, i) => ({ key: String(i), label: fmtKg(v) + 'kg', top: pxToRpx(16 + i * 68) + 'rpx' })),
    points: series.map((s, i) => ({
      key: s.date, date: s.date, x: px(s.date).toFixed(2), y: py(s.w).toFixed(2),
      size: i === selIdx ? 23 : 15, fill: i === selIdx ? C.GREEN_DARK : C.GREEN,
      aria: `${mdText(s.date)} ${name} 最大 ${fmtKg(s.w)}kg×${s.r}`,
    })),
    lastX: px(last.date).toFixed(2), lastY: py(last.w).toFixed(2), lastLabel: fmtKg(last.w) + 'kg',
    xStart: mdText(first.date), xEnd: mdText(last.date),
  };
}

export function buildMeVM(i: MeInput): MeVM {
  const bw = i.profile.bodyweightKg;
  const hStart = addDays(startOfWeek(i.today), -77);
  const heat: HeatCellVM[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 12; col++) {
      const k = addDays(hStart, col * 7 + row);
      const future = k > i.today;
      const d = i.lookup(k);
      const dn = isDoneDay(d);
      const b = dn && d ? dayBurn(d, bw) : 0;
      heat.push({
        key: k, future,
        bg: future ? 'transparent' : !dn ? C.TRACK : b < 200 ? '#B9DABF' : b < 350 ? '#6FB27F' : C.GREEN,
        bd: future ? C.TRACK : 'transparent',
        ol: k === i.ui.heatSel ? C.INK : k === i.today ? C.GREEN_DARK : 'transparent',
        aria: mdText(k) + (future ? '，未到' : dn ? `，已打卡，${partNames(d)}，消耗 ${b} kcal` : '，未打卡'),
      });
    }
  }
  const total12 = i.doneKeys.filter((k) => k >= hStart && k <= i.today).length;
  const hs = i.ui.heatSel ?? i.today;
  const hd = i.lookup(hs);
  const heatDetail = `${mdText(hs)} · ${weekdayText(hs)} · ` + (isDoneDay(hd) && hd ? `${partNames(hd)} · 消耗 ${dayBurn(hd, bw)} kcal` : hs === i.today ? '今天还没完成训练' : '休息日');

  const prog = PROGRESS_LIFTS.includes(i.ui.prog) ? i.ui.prog : PROGRESS_LIFTS[0];
  const exName = exerciseById(prog)!.name;
  const chips = PROGRESS_LIFTS.map((id) => chip(id, exerciseById(id)!.name, id === prog, '', liftIcon(id)));
  const from = addDays(i.today, -84);
  const series = progressSeries(i.all.filter((d) => d.date >= from && d.date <= i.today), prog);

  const y = Number(i.today.slice(0, 4));
  const m0 = Number(i.today.slice(5, 7)) - 1;
  const monthStart = keyOf(y, m0, 1);
  const monthDays = i.all.filter((d) => d.date >= monthStart && d.date <= i.today && isDoneDay(d));
  const counts = Object.fromEntries(PARTS.map((p) => [p.id, 0])) as Record<PartId, number>;
  let vol = 0;
  let burn = 0;
  for (const d of monthDays) {
    vol += dayVolume(d);
    burn += dayBurn(d, bw);
    d.parts.forEach((p) => counts[p]++);
  }
  const top = topPart(counts);
  const seed = seedOf(i.today);
  const checkins = totalCheckins(i.doneKeys, i.today);

  return {
    header: { over: '我的数据', title: i.profile.nickname || '健身达人', num: String(computeStreak(i.doneKeys, i.today).persistDays), numLabel: '已坚持（天）' },
    heat,
    heatDetail,
    totalDays: total12,
    longest: longestPersist(i.doneKeys, hStart, i.today),
    weekStreak: weeklyStreak(i.doneKeys, i.today, i.profile.weeklyTarget),
    muscles: musclesVM(i),
    badges: i.badges ? badgeEntryVM(i.badges.stats, i.badges.owned) : null,
    prog: curve(series, exName, i.ui.progSel, chips),
    month: {
      title: `${m0 + 1} 月成绩`,
      fun: [
        { key: 'vol', label: '训练容量', value: `${(vol / 1000).toFixed(1)} 吨`, note: vol > 0 ? weightFun(vol, seed) : '还没有记录' },
        { key: 'burn', label: '训练消耗', value: `${burn} kcal`, note: burn > 0 ? energyFun(burn, seed) : '还没有记录' },
        { key: 'days', label: '打卡天数', value: `${monthDays.length} 天`, note: `本月共 ${daysInMonth(y, m0)} 天` },
        { key: 'top', label: '最常练', value: top ? partById(top).name : '—', note: top ? persona(counts) : '还没有记录' },
      ],
      report: checkins >= REPORT_UNLOCK ? { unlocked: true, label: '生成本月报告海报' } : { unlocked: false, label: `再打卡 ${REPORT_UNLOCK - checkins} 次解锁月报海报` },
    },
    info: { prog: info(i.ui.infoOpen, 'prog', INFO_TEXT.prog) },
  };
}
