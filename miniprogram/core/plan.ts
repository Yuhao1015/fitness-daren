import { sortParts, templateById, type Template } from './catalog';
import { addDays, startOfWeek, type DayKey } from './date';
import { emptyDay, type DayLookup, type DayRecord, type WeeklyTarget } from './types';

function occupied(d: DayRecord | undefined): boolean {
  return !!d && (d.parts.length > 0 || d.done);
}

export function applyTemplate(lookup: DayLookup, tpl: Template, start: DayKey): { updates: DayRecord[]; count: number } {
  const updates: DayRecord[] = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i);
    const parts = tpl.cycle[i % tpl.cycle.length].parts;
    const existing = lookup(k);
    if (!parts.length || occupied(existing)) continue;
    updates.push({ ...(existing ?? emptyDay(k)), parts: sortParts(parts) });
  }
  return { updates, count: updates.length };
}

export function applyTemplateToast(tpl: Template, count: number): string {
  return count ? `「${tpl.name}」已排入 ${count} 天` : '这 7 天都已有安排，未覆盖';
}

export function planStart(selected: DayKey, today: DayKey): DayKey {
  return selected < today ? today : selected;
}

/** 每周目标 → 周一起的训练日偏移 */
const SLOTS: Record<WeeklyTarget, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5] };
const TEMPLATE_FOR: Record<WeeklyTarget, string> = { 2: 'fullbody-cardio', 3: 'fullbody-cardio', 4: 'upper-lower', 5: 'ppl' };

/** onboarding：按每周目标排本周剩余训练日；本周已全部过去则排下周 */
export function weeklyPlan(target: WeeklyTarget, today: DayKey, lookup: DayLookup): DayRecord[] {
  const sessions = templateById(TEMPLATE_FOR[target]).cycle.filter((c) => c.parts.length);
  let monday = startOfWeek(today);
  let days = SLOTS[target].map((o) => addDays(monday, o)).filter((k) => k >= today);
  if (!days.length) {
    monday = addDays(monday, 7);
    days = SLOTS[target].map((o) => addDays(monday, o));
  }
  const out: DayRecord[] = [];
  days.forEach((k, i) => {
    const existing = lookup(k);
    if (occupied(existing)) return;
    out.push({ ...(existing ?? emptyDay(k)), parts: sortParts(sessions[i % sessions.length].parts) });
  });
  return out;
}
