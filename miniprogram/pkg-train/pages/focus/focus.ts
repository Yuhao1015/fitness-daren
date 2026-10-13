import type { IAppOption } from '../../../app';
import { exerciseById, restSeconds } from '../../../core/catalog';
import { addDays } from '../../../core/date';
import { completeNextSet, ensurePart } from '../../../core/day-ops';
import { headerLayout } from '../../../core/layout';
import { exercisePR } from '../../../core/records';
import { stepReps, stepWeight } from '../../../core/timer';
import { lastPerformance } from '../../../core/workout';
import { restClock } from '../../../services/rest';
import { buildFocusVM, initialDraft, type FocusVM } from '../../../viewmodels/focus';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let exId = '';
let draft: { w: number | null; r: number } = { w: null, r: 0 };
let tick: number | null = null;
let hold: number | null = null;

Page({
  data: { vm: null as FocusVM | null, padTop: 54 },

  onLoad(q: Record<string, string | undefined>) {
    exId = q.exid ?? '';
    if (!exerciseById(exId)) {
      wx.navigateBack();
      return;
    }
    const c = ctx();
    draft = initialDraft(c.days.getOrEmpty(c.today()), exId, c.days.lookup, c.today());
    const win = wx.getWindowInfo();
    this.setData({ padTop: headerLayout(win.windowWidth, win.statusBarHeight, wx.getMenuButtonBoundingClientRect()).paddingTop });
    this.refresh();
  },

  onShow() {
    wx.setKeepScreenOn({ keepScreenOn: true });
    this.stopTick();
    tick = setInterval(() => this.onTick(), 250);
  },

  onHide() {
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.stopTick();
    this.stopHold();
  },

  onUnload() {
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.stopTick();
    this.stopHold();
  },

  stopTick() {
    if (tick !== null) clearInterval(tick);
    tick = null;
  },

  stopHold() {
    if (hold !== null) clearInterval(hold);
    hold = null;
  },

  onTick() {
    if (restClock.timer.endsAt === null) return;
    if (restClock.tick(Date.now())) wx.vibrateLong({});
    this.refresh();
  },

  refresh() {
    const c = ctx();
    const today = c.today();
    const history = c.days.range(addDays(today, -365), addDays(today, -1));
    this.setData({ vm: buildFocusVM({ today, day: c.days.getOrEmpty(today), exId, lookup: c.days.lookup, draft, timer: restClock.timer, now: Date.now(), history }) });
  },

  onW(e: Ev) {
    draft = { ...draft, w: stepWeight(draft.w, Number(e.currentTarget.dataset.d)) };
    this.refresh();
  },

  onR(e: Ev) {
    draft = { ...draft, r: stepReps(draft.r, Number(e.currentTarget.dataset.d)) };
    this.refresh();
  },

  onHoldStart(e: Ev) {
    this.stopHold();
    const kind = e.currentTarget.dataset.kind;
    hold = setInterval(() => (kind === 'w' ? this.onW(e) : this.onR(e)), 120);
  },

  onHoldEnd() {
    this.stopHold();
  },

  onUseLast() {
    const c = ctx();
    const last = lastPerformance(c.days.lookup, exId, c.today());
    if (!last) return;
    draft = { w: last.set.w, r: last.set.r };
    this.refresh();
  },

  onOverload() {
    const vm = this.data.vm;
    if (!vm || !vm.overload.show) return;
    draft = { ...draft, w: vm.overload.w };
    this.refresh();
  },

  onComplete() {
    const c = ctx();
    const ex = exerciseById(exId);
    if (!ex) return;
    const today = c.today();
    const history = c.days.range(addDays(today, -365), addDays(today, -1));
    const before = exercisePR(c.days.getOrEmpty(today), history, exId);
    c.days.update(today, (d) => completeNextSet(ensurePart(d, ex.part), exId, draft, Date.now()));
    c.syncSoon();
    const after = exercisePR(c.days.getOrEmpty(today), history, exId);
    const isNew = !!after && !(before && before.kind === after.kind && before.value === after.value && before.atWeight === after.atWeight);
    wx.vibrateShort({ type: isNew ? 'medium' : 'light' });
    restClock.start(exId, restSeconds(ex), Date.now());
    this.refresh();
  },

  onRestAdjust(e: Ev) {
    restClock.adjust(Number(e.currentTarget.dataset.d), Date.now());
    this.refresh();
  },

  onSkipRest() {
    restClock.skip();
    this.refresh();
  },

  onDone() {
    wx.navigateBack();
  },
});
