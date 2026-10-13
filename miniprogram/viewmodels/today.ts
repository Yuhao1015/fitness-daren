import { CARDIO_TYPES, exerciseById, exercisesOf, partById, type PartId, type StrengthPart } from '../core/catalog';
import { addDays, mdText, startOfWeek, weekdayText, type DayKey } from '../core/date';
import { setsOf } from '../core/day-ops';
import { detectPRs, prSetIndex, prText } from '../core/records';
import { computeStreak, restDaysLeft, totalCheckins, weekProgress } from '../core/streak';
import { fmtClock } from '../core/timer';
import type { CardioLog, DayLookup, DayRecord, Profile, SetEntry } from '../core/types';
import {
  bwFactor, canComplete, cardioBurn, dayBurn, dayVolume, doneSetCount, estimateCardioKcal, fmtKg,
  isDoneDay, lastPerformance, lastSessionSets, setText, suggestPart, suggestText, totalSetCount, trainingMinutes,
} from '../core/workout';
import { C, INFO_TEXT, chip, info, partChips, partRest, type ChipVM, type InfoVM, type PartChipVM } from './common';

export interface TodayUI {
  collapsed: Record<string, boolean>;
  secCollapsed: Record<string, boolean>;
  infoOpen: string | null;
}

export interface TodayInput {
  today: DayKey;
  day: DayRecord;
  lookup: DayLookup;
  history: DayRecord[];
  doneKeys: DayKey[];
  profile: Profile;
  ui: TodayUI;
}

export interface SetRowVM {
  key: string; idx: number; no: number; w: string; r: string; done: boolean;
  wPh: string; wLabel: string; rLabel: string; doneLabel: string; bg: string; fg: string; bd: string;
  /** 上次同一组的成绩（只放数字，如 57.5×8），没有为空 */
  prev: string;
  /** 已完成的组整行浅绿 */
  rowBg: string;
  /** 这一组刷新了纪录 */
  pr: boolean;
}

export interface ExerciseVM {
  key: string; exId: string; name: string; unitLabel: string; count: number; zero: boolean; hasSets: boolean;
  showRows: boolean; expanded: boolean; chevron: number; chevBg: string; meta: string;
  bg: string; bd: string; decFg: string; toggleAria: string; rows: SetRowVM[];
  /** 今天还没有组、且有上次记录：显示「↻ 照上次」代替「−」 */
  canRepeat: boolean; repeatAria: string;
}

export interface CardioVM {
  types: ChipVM[]; mins: string; kcal: string; cBg: string; cBd: string; kcalBd: string;
  hasEst: boolean; est: number; estLabel: string; hint: string;
}

export interface SectionVM {
  key: string; pid: PartId; name: string; color: string; kcalText: string; isCardio: boolean;
  open: boolean; closed: boolean; chevron: number; headBg: string; summary: string; toggleAria: string;
  items: ExerciseVM[]; cardio: CardioVM | null;
}

export interface WeekDotVM {
  key: string; bg: string; bd: string; today: boolean; label: string;
}

export interface RestVM {
  show: boolean; text: string; pct: number; icon: string; color: string; aria: string;
}

export interface TodayVM {
  /** 选部位时右侧是「火焰 + 已坚持 N 天」和还能休几天（月亮）；训练中 / 完成后是消耗 */
  header: { over: string; title: string; num: string; numLabel: string; icon: string; moons: { key: string; on: boolean }[]; pulse: boolean };
  week: { dots: WeekDotVM[]; text: string; aria: string };
  mode: 'pick' | 'training' | 'done';
  suggest: { text: string; part: PartId; name: string; why: string; icon: string; color: string };
  /** 7 个部位图块：右上角是休息了几天，48 小时内练过的变淡 */
  chips: PartChipVM[];
  /** 还没完成过训练的新用户：在下一步要点的控件上出呼吸光圈（推荐条 ▶ → 第一个动作的 + → 第一组的 ✓） */
  hint: { go: boolean; exId: string; target: '' | 'add' | 'check' };
  sections: SectionVM[];
  progressText: string;
  complete: { enabled: boolean; label: string; bg: string; fg: string };
  summary: {
    partsText: string; persistDays: number; weekText: string; checkinNo: number;
    hasPr: boolean; pr: string; volume: number; doneSets: number; mins: number;
    moons: { key: string; on: boolean }[];
  };
  info: { suggest: InfoVM; sets: InfoVM; cardio: InfoVM };
}

/** 全角数字与小数点转半角 */
function halfWidth(raw: string): string {
  return raw.replace(/[０-９．]/g, (ch) => (ch === '．' ? '.' : String.fromCharCode(ch.charCodeAt(0) - 0xfee0))).trim();
}

export function parseWeight(raw: string): number | null {
  const v = parseFloat(halfWidth(raw));
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.min(500, Math.round(v * 10) / 10);
}

export function parseReps(raw: string): number {
  const v = parseInt(halfWidth(raw), 10);
  return Number.isFinite(v) && v > 0 ? Math.min(1000, v) : 0;
}

export function seedFor(lookup: DayLookup, exId: string, today: DayKey): { w: number | null; r: number } {
  const last = lastPerformance(lookup, exId, today);
  if (last) return { w: last.set.w, r: last.set.r };
  const ex = exerciseById(exId);
  return ex ? { w: ex.defaultW, r: ex.defaultR } : { w: null, r: 10 };
}

/** 已完成的组整行底色 */
export const ROW_DONE = '#D5EBD7';

/** 上次同组成绩只放数字：57.5×8、自重×15 */
function prevText(s: SetEntry): string {
  return (s.w != null && s.w > 0 ? fmtKg(s.w) : '自重') + '×' + s.r;
}

const moonsOf = (left: number) => [0, 1].map((n) => ({ key: 'm' + n, on: n < left }));

/** 本周一到周日 7 个点：练过的用当天第一个部位的颜色，今天加圈，排了计划的未来日期描边 */
function weekDots(i: TodayInput): WeekDotVM[] {
  const monday = startOfWeek(i.today);
  return [0, 1, 2, 3, 4, 5, 6].map((n) => {
    const k = addDays(monday, n);
    const d = k === i.today ? i.day : i.lookup(k);
    const color = d && d.parts.length ? partById(d.parts[0]).color : '';
    const today = k === i.today;
    if (isDoneDay(d)) return { key: k, bg: color, bd: color, today, label: `${weekdayText(k)} 已练` };
    if (today) return { key: k, bg: '#FFFFFF', bd: C.GREEN_DARK, today, label: '今天' };
    if (k > i.today && color) return { key: k, bg: '#FFFFFF', bd: color, today, label: `${weekdayText(k)} 已排计划` };
    return { key: k, bg: C.TRACK, bd: C.TRACK, today, label: `${weekdayText(k)} 未练` };
  });
}

function firstTimeHint(i: TodayInput, mode: TodayVM['mode']): TodayVM['hint'] {
  const none: TodayVM['hint'] = { go: false, exId: '', target: '' };
  if (totalCheckins(i.doneKeys, i.today) > 0) return none;
  if (mode === 'pick') return { ...none, go: true };
  if (mode !== 'training' || doneSetCount(i.day) > 0) return none;
  const part = i.day.parts.find((p): p is StrengthPart => p !== 'cardio');
  if (!part) return none;
  const ex = exercisesOf(part)[0];
  return { go: false, exId: ex.id, target: setsOf(i.day, ex.id).length ? 'check' : 'add' };
}

/** 休息条：剩余时间、进度、正在休息的动作所属部位的图标 */
export function buildRestVM(exId: string, left: number, total: number): RestVM {
  const ex = exId ? exerciseById(exId) : undefined;
  if (!ex || left <= 0) return { show: false, text: '', pct: 0, icon: '', color: '', aria: '' };
  const p = partById(ex.part);
  return {
    show: true, text: fmtClock(left), pct: total ? Math.round((left / total) * 100) : 0,
    icon: 'part-' + ex.part, color: p.color, aria: `${ex.name} 组间休息，还剩 ${left} 秒`,
  };
}

function sectionShell(i: TodayInput, pid: PartId) {
  const p = partById(pid);
  const closed = !!i.ui.secCollapsed[pid];
  return {
    key: pid, pid, name: p.name, color: p.color, open: !closed, closed, chevron: closed ? -90 : 0,
    headBg: closed ? C.TINT2 : 'transparent', toggleAria: p.name + (closed ? '，展开' : '，收起'),
  };
}

function strengthSection(i: TodayInput, pid: StrengthPart): SectionVM {
  const f = bwFactor(i.profile.bodyweightKg);
  let secDone = 0;
  let secTotal = 0;
  let kcal = 0;
  let exN = 0;
  const items = exercisesOf(pid).map((ex): ExerciseVM => {
    const sets = setsOf(i.day, ex.id);
    const nDone = sets.filter((s) => s.done).length;
    secDone += nDone;
    secTotal += sets.length;
    kcal += nDone * ex.kcalPerSet;
    if (sets.length) exN++;
    const last = lastPerformance(i.lookup, ex.id, i.today);
    const lastSets = lastSessionSets(i.lookup, ex.id, i.today);
    const prIdx = nDone ? prSetIndex(i.day, i.history, ex.id) : -1;
    const allDone = sets.length > 0 && nDone === sets.length;
    const manual = i.ui.collapsed[ex.id];
    const collapsed = sets.length > 0 && (manual !== undefined ? manual : allDone);
    let best: SetEntry | null = null;
    for (const s of sets) if (s.done && (!best || (s.w ?? 0) > (best.w ?? 0))) best = s;
    const secs = ex.unit === 'secs';
    const rows = sets.map((s, j): SetRowVM => {
      const lbl = `${ex.name} 第 ${j + 1} 组`;
      return {
        key: `${ex.id}-${j}`, idx: j, no: j + 1, w: s.w == null ? '' : fmtKg(s.w), r: String(s.r), done: s.done,
        wPh: ex.defaultW === null ? '自重' : '0', wLabel: lbl + ' 重量', rLabel: lbl + (secs ? ' 秒数' : ' 次数'),
        doneLabel: lbl + (s.done ? ' 已完成' : ' 标记完成'),
        bg: s.done ? C.GREEN : '#FFFFFF', fg: s.done ? '#FFFFFF' : C.MUTED, bd: s.done ? C.GREEN : C.BORDER,
        prev: lastSets && lastSets.sets[j] ? prevText(lastSets.sets[j]) : '',
        // 卡片有完成组后整张是浅绿（C.TINT），完成行要再深一档才看得出来
        rowBg: s.done ? ROW_DONE : 'transparent',
        pr: j === prIdx,
      };
    });
    return {
      key: ex.id, exId: ex.id, name: ex.name, unitLabel: secs ? '秒' : '次', count: sets.length, zero: sets.length === 0,
      hasSets: sets.length > 0, showRows: sets.length > 0 && !collapsed, expanded: !collapsed, chevron: collapsed ? -90 : 0,
      chevBg: sets.length ? C.TINT : 'transparent',
      meta: collapsed
        ? `已完成 ${nDone} / ${sets.length} 组` + (best ? ' · 最佳 ' + setText(best, ex) : '')
        : (last ? '上次 ' + setText(last.set, ex) : '首次'),
      bg: nDone ? C.TINT : '#FFFFFF', bd: nDone ? C.GREEN : C.BORDER, decFg: sets.length ? C.INK : C.MUTED,
      toggleAria: ex.name + (collapsed ? '，展开各组' : '，收起各组'), rows,
      canRepeat: sets.length === 0 && !!lastSets,
      repeatAria: lastSets ? `${ex.name} 照上次 ${lastSets.sets.length} 组` : '',
    };
  });
  return {
    ...sectionShell(i, pid), kcalText: `${Math.round(kcal * f)} kcal`, isCardio: false,
    summary: exN ? `${exN} 个动作 · 已完成 ${secDone} / ${secTotal} 组` : '还没有记录', items, cardio: null,
  };
}

function cardioSection(i: TodayInput): SectionVM {
  const cd: CardioLog = i.day.cardio ?? { type: 'run', mins: null, kcal: null, source: 'device' };
  const k = cardioBurn(i.day);
  const mins = cd.mins ?? 0;
  const type = CARDIO_TYPES.find((t) => t.id === cd.type) ?? CARDIO_TYPES[0];
  const est = mins > 0 ? estimateCardioKcal(type.id, mins, i.profile.bodyweightKg) : 0;
  return {
    ...sectionShell(i, 'cardio'), kcalText: `${k} kcal`, isCardio: true, items: [],
    summary: k > 0 ? `${type.name}${mins ? ' ' + mins + ' 分钟' : ''} · 已填消耗` : '还没填写消耗',
    cardio: {
      types: CARDIO_TYPES.map((t) => chip(t.id, t.name, t.id === cd.type)),
      mins: cd.mins == null ? '' : String(cd.mins),
      kcal: cd.kcal == null ? '' : String(cd.kcal),
      cBg: k > 0 ? C.TINT : '#FFFFFF', cBd: k > 0 ? C.GREEN : C.BORDER, kcalBd: k > 0 ? C.GREEN : C.BORDER,
      hasEst: est > 0 && k === 0, est, estLabel: `填入参考值 ${est} kcal`,
      hint: k > 0 ? `已计入今日消耗 ${k} kcal` + (cd.source === 'estimate' ? '（估）' : '') : '',
    },
  };
}

export function buildTodayVM(i: TodayInput): TodayVM {
  const { day, profile } = i;
  const parts = day.parts;
  const mode: TodayVM['mode'] = parts.length === 0 ? 'pick' : isDoneDay(day) ? 'done' : 'training';
  const burn = dayBurn(day, profile.bodyweightKg);
  const done = doneSetCount(day);
  const ok = canComplete(day);
  const sugg = suggestPart(i.lookup, i.today);
  const streak = computeStreak(i.doneKeys, i.today);
  const week = weekProgress(i.doneKeys, i.today, profile.weeklyTarget);
  const pr = mode === 'done' ? detectPRs(day, i.history)[0] : undefined;
  const left = restDaysLeft(i.doneKeys, i.today);
  const picking = mode === 'pick';
  return {
    header: {
      over: `${mdText(i.today)} · ${weekdayText(i.today)}`,
      title: mode === 'done' ? '训练完成' : '今日训练',
      num: String(picking ? streak.persistDays : burn),
      numLabel: picking ? '已坚持（天）' : mode === 'done' ? '本次消耗 kcal' : '预计消耗 kcal',
      icon: picking ? 'flame' : '',
      moons: picking ? moonsOf(left) : [],
      pulse: picking && streak.alive && left === 0,
    },
    week: {
      dots: weekDots(i),
      text: `${week.done}/${week.target}`,
      aria: `本周已练 ${week.done} 次，目标 ${week.target} 次`,
    },
    mode,
    suggest: {
      text: suggestText(sugg),
      part: sugg.part,
      name: partById(sugg.part).name,
      why: sugg.daysAgo ? `已休息 ${sugg.daysAgo} 天` : '最近没练过',
      icon: 'part-' + sugg.part,
      color: partById(sugg.part).color,
    },
    chips: partChips(parts, partRest(i.lookup, i.today)),
    hint: firstTimeHint(i, mode),
    sections: parts.map((p) => (p === 'cardio' ? cardioSection(i) : strengthSection(i, p))),
    progressText: `已完成 ${done} / ${totalSetCount(day)} 组` + (parts.includes('cardio') ? ` · 有氧 ${cardioBurn(day)} kcal` : ''),
    complete: { enabled: ok, label: '完成训练', bg: ok ? C.GREEN : C.BORDER, fg: ok ? '#FFFFFF' : C.TEXT2 },
    summary: {
      partsText: parts.map((p) => partById(p).name).join(' + ') + ` · 消耗约 ${burn} kcal`,
      persistDays: streak.persistDays,
      weekText: `本周 ${week.done} / ${week.target} 次`,
      checkinNo: totalCheckins(i.doneKeys, i.today),
      hasPr: !!pr,
      pr: pr ? prText(pr) : '',
      volume: Math.round(dayVolume(day)),
      doneSets: done,
      mins: trainingMinutes(day),
      moons: moonsOf(left),
    },
    info: {
      suggest: info(i.ui.infoOpen, 'suggest', INFO_TEXT.suggest),
      sets: info(i.ui.infoOpen, 'sets', INFO_TEXT.sets),
      cardio: info(i.ui.infoOpen, 'cardio', INFO_TEXT.cardio),
    },
  };
}
