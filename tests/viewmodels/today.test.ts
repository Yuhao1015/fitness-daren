import { describe, expect, it } from 'vitest';
import { emptyDay, type DayRecord, type Profile } from '../../miniprogram/core/types';
import { addSet, setCardio, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { ROW_DONE, buildRestVM, buildTodayVM, parseReps, parseWeight, seedFor, type TodayUI } from '../../miniprogram/viewmodels/today';

const T = '2026-10-10';
const ui: TodayUI = { collapsed: {}, secCollapsed: {}, infoOpen: null };

function withSets(d: DayRecord, exId: string, sets: Array<[number | null, number, boolean]>): DayRecord {
  sets.forEach(([w, r, done], i) => {
    d = addSet(d, exId, { w, r });
    d = updateSet(d, exId, i, { w, r, done }, 0);
  });
  return d;
}

function input(day: DayRecord, history: DayRecord[] = [], profile: Profile = DEFAULT_PROFILE, doneKeys: string[] = []) {
  const m = new Map(history.map((h) => [h.date, h]));
  return { today: T, day, lookup: (k: string) => m.get(k), history, doneKeys, profile, ui };
}

describe('buildTodayVM', () => {
  it('starts in pick mode with a suggestion', () => {
    const vm = buildTodayVM(input(emptyDay(T)));
    expect(vm.mode).toBe('pick');
    expect(vm.suggest.text).toBe('推荐练「腿」 · 最近没练过');
    expect(vm.header).toEqual({ over: '10月10日 · 周六', title: '今日训练', num: '0', numLabel: '已坚持（天）', icon: 'flame', moons: [{ key: 'm0', on: false }, { key: 'm1', on: false }], pulse: false });
    expect(vm.chips.every((c) => !c.on)).toBe(true);
  });

  it('puts the persist streak in the header while picking, with rest days left as moons', () => {
    const vm = buildTodayVM(input(emptyDay(T), [], DEFAULT_PROFILE, ['2026-10-03', '2026-10-05', '2026-10-08']));
    expect(vm.header.num).toBe('8');
    expect(vm.header.icon).toBe('flame');
    expect(vm.header.moons.map((m) => m.on)).toEqual([true, false]);
    expect(vm.header.pulse).toBe(false);
    const last = buildTodayVM(input(emptyDay(T), [], DEFAULT_PROFILE, ['2026-10-07']));
    expect(last.header.moons.map((m) => m.on)).toEqual([false, false]);
    expect(last.header.pulse).toBe(true);
    const training = buildTodayVM(input(togglePart(emptyDay(T), 'chest'), [], DEFAULT_PROFILE, ['2026-10-07']));
    expect(training.header).toMatchObject({ num: '0', numLabel: '预计消耗 kcal', icon: '', moons: [], pulse: false });
  });

  it('draws this week as 7 dots: done days in their part colour, today ringed, planned days outlined', () => {
    const mon = setDone(togglePart(emptyDay('2026-10-05'), 'leg'), true, 0);
    const wed = setDone(togglePart(emptyDay('2026-10-07'), 'chest'), true, 0);
    const sun = togglePart(emptyDay('2026-10-11'), 'back');
    const vm = buildTodayVM(input(emptyDay(T), [mon, wed, sun], DEFAULT_PROFILE, ['2026-10-05', '2026-10-07']));
    expect(vm.week.dots).toHaveLength(7);
    expect(vm.week.dots[0]).toMatchObject({ bg: '#3B6FB6', today: false });
    expect(vm.week.dots[2]).toMatchObject({ bg: '#E07B39' });
    expect(vm.week.dots[1].bg).toBe('#EEF2EE');
    expect(vm.week.dots[5]).toMatchObject({ today: true, bg: '#FFFFFF' });
    expect(vm.week.dots[6]).toMatchObject({ bg: '#FFFFFF', bd: '#B5523B', today: false });
    expect(vm.week.text).toBe('2/3');
  });

  it('offers ↻ repeat-last-session on an empty exercise and shows last session per set', () => {
    const hist = [setDone(withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[50, 10, true], [55, 8, true], [57.5, 6, true]]), true, 0)];
    const empty = buildTodayVM(input(togglePart(emptyDay(T), 'chest'), hist));
    const bench = empty.sections[0].items.find((x) => x.exId === 'bench-press')!;
    expect(bench.canRepeat).toBe(true);
    expect(bench.repeatAria).toBe('杠铃卧推 照上次 3 组');
    expect(empty.sections[0].items.find((x) => x.exId === 'db-fly')!.canRepeat).toBe(false);

    const day = withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[50, 10, true], [55, 8, false], [57.5, 6, false], [60, 3, false]]);
    const vm = buildTodayVM(input(day, hist));
    const ex = vm.sections[0].items.find((x) => x.exId === 'bench-press')!;
    expect(ex.canRepeat).toBe(false);
    expect(ex.rows.map((r) => r.prev)).toEqual(['50×10', '55×8', '57.5×6', '']);
  });

  it('tints finished rows and marks the set that broke the record', () => {
    const hist = [setDone(withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[57.5, 6, true]]), true, 0)];
    const day = withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[55, 8, true], [60, 3, true], [60, 3, false]]);
    const rows = buildTodayVM(input(day, hist)).sections[0].items.find((x) => x.exId === 'bench-press')!.rows;
    expect(rows.map((r) => r.rowBg)).toEqual([ROW_DONE, ROW_DONE, 'transparent']);
    expect(ROW_DONE).not.toBe('#EAF5EA');
    expect(rows.map((r) => r.pr)).toEqual([false, true, false]);
  });

  it('shows on each part tile how many days it has rested', () => {
    const hist = [setDone(togglePart(emptyDay('2026-10-09'), 'chest'), true, 0), setDone(togglePart(emptyDay('2026-10-06'), 'leg'), true, 0)];
    const chips = buildTodayVM(input(emptyDay(T), hist, DEFAULT_PROFILE, ['2026-10-06', '2026-10-09'])).chips;
    expect(chips.find((c) => c.id === 'chest')).toMatchObject({ badge: '1', dim: true });
    expect(chips.find((c) => c.id === 'leg')).toMatchObject({ badge: '4', dim: false });
    expect(chips.find((c) => c.id === 'arm')).toMatchObject({ badge: '' });
  });

  it('guides a brand-new user with a ring on the next control, until the first training is done', () => {
    expect(buildTodayVM(input(emptyDay(T))).hint).toEqual({ go: true, exId: '', target: '' });
    const chest = togglePart(emptyDay(T), 'chest');
    expect(buildTodayVM(input(chest)).hint).toEqual({ go: false, exId: 'bench-press', target: 'add' });
    const added = addSet(chest, 'bench-press', { w: 50, r: 8 });
    expect(buildTodayVM(input(added)).hint).toEqual({ go: false, exId: 'bench-press', target: 'check' });
    const ticked = updateSet(added, 'bench-press', 0, { done: true }, 0);
    expect(buildTodayVM(input(ticked)).hint).toEqual({ go: false, exId: '', target: '' });
    expect(buildTodayVM(input(emptyDay(T), [], DEFAULT_PROFILE, ['2026-10-01'])).hint.go).toBe(false);
    const cardioOnly = togglePart(emptyDay(T), 'cardio');
    expect(buildTodayVM(input(cardioOnly)).hint).toEqual({ go: false, exId: '', target: '' });
  });

  it('builds the rest bar for the exercise being rested', () => {
    expect(buildRestVM('', 0, 0).show).toBe(false);
    const r = buildRestVM('bench-press', 95, 120);
    expect(r).toMatchObject({ show: true, text: '1:35', pct: 79, icon: 'part-chest', color: '#E07B39' });
  });

  it('shows sets, last performance and progress while training', () => {
    const hist = [setDone(withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[50, 8, true]]), true, 0)];
    let day = togglePart(togglePart(emptyDay(T), 'chest'), 'cardio');
    day = withSets(day, 'bench-press', [[52.5, 8, true], [52.5, 8, true], [52.5, 6, false]]);
    const vm = buildTodayVM(input(day, hist));
    expect(vm.mode).toBe('training');
    const chest = vm.sections[0];
    expect(chest.kcalText).toBe('18 kcal');
    expect(chest.items[0].meta).toBe('上次 50kg×8');
    expect(chest.items[0].rows.map((r) => r.w)).toEqual(['52.5', '52.5', '52.5']);
    expect(chest.items[0].showRows).toBe(true);
    expect(chest.items[1].meta).toBe('首次');
    expect(vm.progressText).toBe('已完成 2 / 3 组 · 有氧 0 kcal');
    expect(vm.complete.enabled).toBe(true);
  });

  it('auto-collapses a fully done exercise unless the user toggled it', () => {
    let day = togglePart(emptyDay(T), 'chest');
    day = withSets(day, 'push-up', [[null, 15, true]]);
    const vm = buildTodayVM(input(day));
    const pushUp = vm.sections[0].items.find((x) => x.exId === 'push-up')!;
    expect(pushUp.showRows).toBe(false);
    expect(pushUp.meta).toBe('已完成 1 / 1 组 · 最佳 自重×15');
    const opened = buildTodayVM({ ...input(day), ui: { ...ui, collapsed: { 'push-up': false } } });
    expect(opened.sections[0].items.find((x) => x.exId === 'push-up')!.showRows).toBe(true);
  });

  it('offers a cardio estimate from minutes and bodyweight', () => {
    const day = setCardio(togglePart(emptyDay(T), 'cardio'), { mins: 30 });
    const vm = buildTodayVM(input(day, [], { ...DEFAULT_PROFILE, bodyweightKg: 84 }));
    const c = vm.sections[0].cardio!;
    expect(c.hasEst).toBe(true);
    expect(c.est).toBe(360);
    expect(c.estLabel).toBe('填入参考值 360 kcal');
    expect(vm.sections[0].summary).toBe('还没填写消耗');
    expect(vm.complete.enabled).toBe(false);
    expect(vm.complete.label).toBe('完成训练');
  });

  it('summarizes a finished day with persist days and a PR', () => {
    const hist = [setDone(withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[50, 8, true]]), true, 0)];
    const day = setDone(withSets(togglePart(emptyDay(T), 'chest'), 'bench-press', [[55, 5, true]]), true, 0);
    const vm = buildTodayVM(input(day, hist, DEFAULT_PROFILE, ['2026-10-07', T]));
    expect(vm.mode).toBe('done');
    expect(vm.header.title).toBe('训练完成');
    expect(vm.summary.persistDays).toBe(4);
    expect(vm.summary.checkinNo).toBe(2);
    expect(vm.summary.weekText).toBe('本周 2 / 3 次');
    expect(vm.summary.pr).toBe('新纪录 · 杠铃卧推 55kg（之前最高 50kg）');
    expect(vm.summary.partsText).toBe('胸 · 消耗约 9 kcal');
  });

  it('scales kcal per set by bodyweight', () => {
    const vm = buildTodayVM(input(togglePart(emptyDay(T), 'chest'), [], { ...DEFAULT_PROFILE, bodyweightKg: 105 }));
    expect(vm.sections[0].items[0].meta).toBe('首次');
  });

  it('seeds new sets from the last session or catalog defaults', () => {
    const hist = [withSets(togglePart(emptyDay('2026-10-07'), 'chest'), 'bench-press', [[52.5, 6, true]])];
    const m = new Map(hist.map((h) => [h.date, h]));
    expect(seedFor((k) => m.get(k), 'bench-press', T)).toEqual({ w: 52.5, r: 6 });
    expect(seedFor(() => undefined, 'push-up', T)).toEqual({ w: null, r: 15 });
  });

  it('parses messy weight and reps input', () => {
    expect(parseWeight('52.5')).toBe(52.5);
    expect(parseWeight('52.')).toBe(52);
    expect(parseWeight('５２．５')).toBe(52.5);
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('0')).toBeNull();
    expect(parseWeight('9999')).toBe(500);
    expect(parseReps('8')).toBe(8);
    expect(parseReps('８')).toBe(8);
    expect(parseReps('-3')).toBe(0);
    expect(parseReps('')).toBe(0);
  });
});
