import { APP_NAME } from '../config';
import { PARTS, partById, type PartId } from '../core/catalog';
import { daysInMonth, keyOf, weekdayMon0, weekdayText, type DayKey } from '../core/date';
import { persona, posterFun, seedOf, topPart, weightFun } from '../core/fun';
import type { CheckinPosterData, HeatCell } from '../core/poster/checkin';
import type { ReportPosterData } from '../core/poster/report';
import { detectPRs, monthPRCount, prText } from '../core/records';
import { computeStreak, totalCheckins, weeklyStreak } from '../core/streak';
import type { DayLookup, DayRecord, Profile } from '../core/types';
import { dayBurn, dayVolume, doneSetCount, isDoneDay } from '../core/workout';
import { C } from './common';

export const TROPHY_ICON = '/assets/icons/trophy-warn.png';
export const partIconSrc = (p: PartId): string => `/assets/icons/part-${p}-white.png`;

export interface PosterInput {
  today: DayKey;
  lookup: DayLookup;
  all: DayRecord[];
  doneKeys: DayKey[];
  profile: Profile;
}

function ym(today: DayKey): { y: number; m0: number } {
  return { y: Number(today.slice(0, 4)), m0: Number(today.slice(5, 7)) - 1 };
}

export function monthHeat(today: DayKey, lookup: DayLookup): HeatCell[] {
  const { y, m0 } = ym(today);
  const first = keyOf(y, m0, 1);
  const cells: HeatCell[] = [];
  for (let i = 0; i < weekdayMon0(first); i++) cells.push({ bg: 'transparent', ring: 'transparent' });
  for (let d = 1; d <= daysInMonth(y, m0); d++) {
    const k = keyOf(y, m0, d);
    const day = lookup(k);
    const planned = !!day && day.parts.length > 0;
    cells.push({
      bg: isDoneDay(day) ? C.GREEN : planned && k >= today ? C.TINT : C.TRACK,
      ring: k === today ? C.INK : 'transparent',
    });
  }
  return cells;
}

export function checkinPosterData(i: PosterInput, qr: string | null): CheckinPosterData {
  const day = i.lookup(i.today);
  const parts = day ? day.parts : [];
  const bw = i.profile.bodyweightKg;
  const volume = day ? Math.round(dayVolume(day)) : 0;
  const burn = day ? dayBurn(day, bw) : 0;
  const pr = day ? detectPRs(day, i.all.filter((d) => d.date < i.today))[0] : undefined;
  const { y, m0 } = ym(i.today);
  const monthStart = keyOf(y, m0, 1);
  return {
    appName: APP_NAME,
    date: `${i.today.replace(/-/g, '.')} ${weekdayText(i.today)}`,
    persistDays: computeStreak(i.doneKeys, i.today).persistDays,
    sub: '今日训练已完成',
    parts: parts.map((p) => ({ color: partById(p).color, icon: partIconSrc(p) })),
    doneSets: day ? doneSetCount(day) : 0,
    volume,
    burn,
    pr: pr ? prText(pr) : '',
    fun: posterFun(volume, burn, seedOf(i.today)),
    monthLabel: `${m0 + 1} 月打卡`,
    monthDone: i.doneKeys.filter((k) => k >= monthStart && k <= i.today).length,
    heat: monthHeat(i.today, i.lookup),
    serial: `No.${String(totalCheckins(i.doneKeys, i.today)).padStart(3, '0')}`,
    qr,
    trophyIcon: TROPHY_ICON,
  };
}

export function reportPosterData(i: PosterInput, qr: string | null): ReportPosterData {
  const { y, m0 } = ym(i.today);
  const monthStart = keyOf(y, m0, 1);
  const days = i.all.filter((d) => d.date >= monthStart && d.date <= i.today && isDoneDay(d));
  const counts = Object.fromEntries(PARTS.map((p) => [p.id, 0])) as Record<PartId, number>;
  let vol = 0;
  let burn = 0;
  for (const d of days) {
    vol += dayVolume(d);
    burn += dayBurn(d, i.profile.bodyweightKg);
    d.parts.forEach((p) => counts[p]++);
  }
  const top = topPart(counts);
  const max = top ? counts[top] : 1;
  return {
    appName: APP_NAME,
    monthLabel: `${y} 年 ${m0 + 1} 月`,
    title: `${m0 + 1} 月训练报告`,
    days: days.length,
    persona: persona(counts),
    tons: (vol / 1000).toFixed(1),
    burn,
    prs: monthPRCount(i.all, monthStart, i.today),
    dist: PARTS.filter((p) => counts[p.id] > 0)
      .sort((a, b) => counts[b.id] - counts[a.id])
      .slice(0, 5)
      .map((p) => ({ name: p.name, color: p.color, count: counts[p.id], pct: Math.round((counts[p.id] / max) * 100) })),
    fun: vol >= 100 ? '本月举起的总重量 ' + weightFun(vol, seedOf(i.today)) : '',
    heat: monthHeat(i.today, i.lookup),
    qr,
    weekStreak: weeklyStreak(i.doneKeys, i.today, i.profile.weeklyTarget),
  };
}
