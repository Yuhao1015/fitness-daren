import { PARTS, TEMPLATES, partById, type PartId } from '../core/catalog';
import { keyOf, mdText, monthGrid, weekdayText, type DayKey } from '../core/date';
import { dayIntake } from '../core/food';
import { planStart } from '../core/plan';
import type { DayLookup } from '../core/types';
import { dayBurn, recoveryHint } from '../core/workout';
import { C, INFO_TEXT, info, partChips, partRest, type InfoVM, type PartChipVM } from './common';

export interface CalendarInput {
  today: DayKey;
  year: number;
  month0: number;
  sel: DayKey;
  lookup: DayLookup;
  bodyweightKg: number | null;
  infoOpen: string | null;
}

export interface CellVM {
  key: string; blank: boolean; date: string; day: number; isSel: boolean;
  bg: string; bd: string; ol: string; numBg: string; numFg: string;
  dots: { key: string; color: string; ring: string }[]; aria: string;
}

export interface CalendarVM {
  header: { over: string; title: string; num: string; numLabel: string };
  showBack: boolean;
  cells: CellVM[];
  sel: {
    title: string; status: string; badgeBg: string; badgeFg: string; chips: PartChipVM[];
    hasHint: boolean; hint: string; hasStats: boolean; burn: number; intake: number;
    canStart: boolean; canMark: boolean; markLabel: string;
  };
  templates: { key: string; id: string; name: string; days: { key: string; label: string; rest: boolean; bg: string; icons: { key: string; name: string; color: string }[] }[] }[];
  stats: { key: string; name: string; color: string; icon: string; count: number }[];
  info: { legend: InfoVM; tpl: InfoVM };
}

export function shiftMonth(year: number, month0: number, step: number): { year: number; month0: number } {
  const m = month0 + step;
  return { year: year + Math.floor(m / 12), month0: ((m % 12) + 12) % 12 };
}

export function selectAfterShift(today: DayKey, year: number, month0: number): DayKey {
  return today.slice(0, 7) === keyOf(year, month0, 1).slice(0, 7) ? today : keyOf(year, month0, 1);
}

function statusOf(planned: boolean, done: boolean, past: boolean): string {
  return done ? '已完成' : planned ? (past ? '计划未完成' : '已计划') : '未安排';
}

export function buildCalendarVM(i: CalendarInput): CalendarVM {
  const counts = Object.fromEntries(PARTS.map((p) => [p.id, 0])) as Record<PartId, number>;
  let monthDone = 0;
  const cells = monthGrid(i.year, i.month0).map((k, idx): CellVM => {
    if (!k) {
      return { key: 'b' + idx, blank: true, date: '', day: 0, isSel: false, bg: '', bd: '', ol: '', numBg: '', numFg: '', dots: [], aria: '' };
    }
    const d = i.lookup(k);
    const parts = d ? d.parts : [];
    const planned = parts.length > 0;
    const done = planned && !!d && d.done;
    const isT = k === i.today;
    const past = k < i.today;
    if (done) monthDone++;
    parts.forEach((p) => counts[p]++);
    return {
      key: k, blank: false, date: k, day: Number(k.slice(8)), isSel: k === i.sel,
      bg: done ? C.GREEN : planned ? C.TINT : '#FFFFFF',
      bd: planned ? 'transparent' : C.BORDER,
      ol: k === i.sel ? C.INK : 'transparent',
      numBg: isT ? (done ? '#FFFFFF' : C.INK) : 'transparent',
      numFg: isT ? (done ? C.GREEN : '#FFFFFF') : done ? '#FFFFFF' : past && !planned ? C.TEXT3 : C.INK,
      dots: parts.slice(0, 4).map((p) => ({ key: p, color: partById(p).color, ring: done ? '#FFFFFF' : 'transparent' })),
      aria: `${mdText(k)}${isT ? '（今天）' : ''}，${statusOf(planned, done, past)}` + (planned ? '：' + parts.map((p) => partById(p).name).join('、') : ''),
    };
  });

  const selDay = i.lookup(i.sel);
  const selParts = selDay ? selDay.parts : [];
  const selDone = selParts.length > 0 && !!selDay && selDay.done;
  const selPast = i.sel < i.today;
  const status = statusOf(selParts.length > 0, selDone, selPast);
  const badge = selDone ? [C.GREEN, '#FFFFFF'] : selParts.length ? (selPast ? [C.WARN_BG, C.WARN_FG] : [C.TINT, C.GREEN_DARK]) : [C.CHIP_OFF, C.TEXT2];
  const hint = recoveryHint(i.lookup, i.sel, selParts);
  const burn = selDay ? dayBurn(selDay, i.bodyweightKg) : 0;
  const intake = selDay ? dayIntake(selDay).kcal : 0;
  const start = planStart(i.sel, i.today);
  const isThisMonth = i.today.slice(0, 7) === keyOf(i.year, i.month0, 1).slice(0, 7);

  return {
    header: { over: '训练日历', title: `${i.year}年${i.month0 + 1}月`, num: String(monthDone), numLabel: '本月完成（天）' },
    showBack: !(isThisMonth && i.sel === i.today),
    cells,
    sel: {
      title: `${mdText(i.sel)} · ${weekdayText(i.sel)}` + (i.sel === i.today ? ' · 今天' : ''),
      status, badgeBg: badge[0], badgeFg: badge[1], chips: partChips(selParts, partRest(i.lookup, i.sel)),
      hasHint: !!hint, hint, hasStats: burn > 0 || intake > 0, burn, intake,
      canStart: i.sel === i.today && selParts.length > 0 && !selDone,
      canMark: selPast && selParts.length > 0,
      markLabel: selDone ? '取消完成' : '标记为已完成',
    },
    templates: TEMPLATES.map((tp) => ({
      key: tp.id, id: tp.id, name: tp.name,
      days: tp.cycle.map((c, j) => ({
        key: `${tp.id}-${j}`,
        label: c.label,
        rest: c.parts.length === 0,
        bg: c.parts.length ? C.TINT : C.CHIP_OFF,
        icons: c.parts.map((p) => ({ key: p, name: 'part-' + p, color: partById(p).color })),
      })),
    })),
    stats: PARTS.map((p) => ({ key: p.id, name: p.name, color: p.color, icon: 'part-' + p.id, count: counts[p.id] })),
    info: {
      legend: info(i.infoOpen, 'legend', ''),
      tpl: info(i.infoOpen, 'tpl', `从 ${mdText(start)} 起排 7 天，已有安排的日子不会被覆盖` + INFO_TEXT.tplSuffix),
    },
  };
}
