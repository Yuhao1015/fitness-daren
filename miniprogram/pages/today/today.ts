import type { IAppOption } from '../../app';
import { FEATURES } from '../../config';
import { badgeById, type BadgeDef } from '../../core/badges';
import { exerciseById, restSeconds } from '../../core/catalog';
import { addDays } from '../../core/date';
import { addSet, addSets, removeLastSet, setCardio, setDone, setsOf, togglePart, updateSet } from '../../core/day-ops';
import { exercisePR, type PR } from '../../core/records';
import { sharePath } from '../../core/share-link';
import { computeStreak } from '../../core/streak';
import type { CardioTypeId, DayRecord, PartId } from '../../core/types';
import { fmtKg, lastSessionSets } from '../../core/workout';
import { checkBadges, motionOff } from '../../services/badges';
import { navFlags } from '../../services/nav';
import { canRemind, requestTrainReminder } from '../../services/reminder';
import { restClock } from '../../services/rest';
import { createShare } from '../../services/share';
import { setTab, toast } from '../../services/ui';
import { buildRestVM, buildTodayVM, parseReps, parseWeight, seedFor, type RestVM, type TodayUI, type TodayVM } from '../../viewmodels/today';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
  detail: { value?: string };
}

const EMPTY_CEL = { show: false, id: '', name: '', desc: '', icon: 'trophy', color: '#2E7D4F', motion: true };
let ui: TodayUI = { collapsed: {}, secCollapsed: {}, infoOpen: null };
let queue: BadgeDef[] = [];
let tick: number | null = null;
let screenOn = false;
const ctx = () => getApp<IAppOption>().ctx;
const historyOf = (today: string) => ctx().days.range(addDays(today, -365), addDays(today, -1));

/** 新纪录只放数字：60kg、50kg×10、×18 */
function prShort(pr: PR): string {
  if (pr.kind === 'weight') return fmtKg(pr.value) + 'kg';
  return (pr.atWeight != null ? fmtKg(pr.atWeight) + 'kg' : '') + '×' + pr.value;
}
const samePR = (a: PR | undefined, b: PR | undefined) => !!a && !!b && a.kind === b.kind && a.value === b.value && a.atWeight === b.atWeight;

Page({
  data: { vm: null as TodayVM | null, features: FEATURES, canRemind: false, cel: EMPTY_CEL, rest: buildRestVM('', 0, 0) as RestVM, motion: true, refill: false },

  onShow() {
    setTab(this, 0);
    this.stopTick();
    tick = setInterval(() => this.onTick(), 250);
    const c = ctx();
    if (!c.profile.get().onboardedAt && !navFlags.onboardingShown) {
      navFlags.onboardingShown = true;
      wx.navigateTo({ url: '/pkg-onboard/pages/onboarding/onboarding' });
    }
    this.refresh();
    this.onTick();
  },

  onHide() {
    this.stopTick();
    this.keepScreen(false);
  },

  onUnload() {
    this.stopTick();
    this.keepScreen(false);
  },

  stopTick() {
    if (tick !== null) clearInterval(tick);
    tick = null;
  },

  /** 训练中保持屏幕常亮（只在状态变化时调用接口） */
  keepScreen(on: boolean) {
    if (on === screenOn) return;
    screenOn = on;
    wx.setKeepScreenOn({ keepScreenOn: on });
  },

  /** 休息条心跳：只更新 rest 这一块数据；倒计时走完长振动一次 */
  onTick() {
    const now = Date.now();
    if (restClock.tick(now)) wx.vibrateLong({});
    const rest = buildRestVM(restClock.exId, restClock.left(now), restClock.timer.total);
    const cur = this.data.rest;
    if (rest.show !== cur.show || rest.text !== cur.text || rest.icon !== cur.icon) this.setData({ rest });
  },

  refresh() {
    const c = ctx();
    const today = c.today();
    const vm = buildTodayVM({
      today,
      day: c.days.getOrEmpty(today),
      lookup: c.days.lookup,
      history: historyOf(today),
      doneKeys: c.days.doneDayKeys(),
      profile: c.profile.get(),
      ui,
    });
    this.setData({ vm, canRemind: canRemind(c), motion: !motionOff(c.storage) });
    this.keepScreen(vm.mode === 'training');
  },

  edit(fn: (d: DayRecord) => DayRecord) {
    const c = ctx();
    c.days.update(c.today(), fn);
    c.syncSoon();
    this.refresh();
  },

  showNextBadge() {
    const b = queue.shift();
    if (!b) {
      this.setData({ cel: EMPTY_CEL });
      return;
    }
    this.setData({ cel: { show: true, id: b.id, name: b.name, desc: b.desc, icon: b.icon, color: b.color, motion: !motionOff(ctx().storage) } });
  },

  onCelebrateClose() {
    this.showNextBadge();
  },

  onInfo(e: Ev) {
    const k = e.currentTarget.dataset.key as string;
    ui = { ...ui, infoOpen: ui.infoOpen === k ? null : k };
    this.refresh();
  },

  onSuggestPick() {
    const part = this.data.vm ? this.data.vm.suggest.part : 'leg';
    this.edit((d) => togglePart(d, part));
  },

  onTogglePart(e: Ev) {
    const pid = e.currentTarget.dataset.pid as PartId;
    this.edit((d) => togglePart(d, pid));
  },

  onToggleSection(e: Ev) {
    const pid = e.currentTarget.dataset.pid as string;
    ui = { ...ui, secCollapsed: { ...ui.secCollapsed, [pid]: !ui.secCollapsed[pid] } };
    this.refresh();
  },

  onToggleExercise(e: Ev) {
    const exId = e.currentTarget.dataset.exid as string;
    const vm = this.data.vm;
    if (!vm) return;
    for (const sec of vm.sections) {
      const ex = sec.items.find((x) => x.exId === exId);
      if (ex && ex.hasSets) {
        ui = { ...ui, collapsed: { ...ui.collapsed, [exId]: ex.expanded } };
        this.refresh();
        return;
      }
    }
  },

  onFocus(e: Ev) {
    wx.navigateTo({ url: `/pkg-train/pages/focus/focus?exid=${e.currentTarget.dataset.exid}` });
  },

  onIncSet(e: Ev) {
    const exId = e.currentTarget.dataset.exid as string;
    const c = ctx();
    ui = { ...ui, collapsed: { ...ui.collapsed, [exId]: false } };
    const seed = seedFor(c.days.lookup, exId, c.today());
    this.edit((d) => addSet(d, exId, seed));
  },

  /** ↻ 照上次：按上次那天的全部已完成组一次排好，之后只需逐行打勾 */
  onRepeatLast(e: Ev) {
    const exId = e.currentTarget.dataset.exid as string;
    const c = ctx();
    const last = lastSessionSets(c.days.lookup, exId, c.today());
    if (!last) return;
    ui = { ...ui, collapsed: { ...ui.collapsed, [exId]: false } };
    this.edit((d) => addSets(d, exId, last.sets.map((s) => ({ w: s.w, r: s.r }))));
  },

  onDecSet(e: Ev) {
    const exId = e.currentTarget.dataset.exid as string;
    this.edit((d) => removeLastSet(d, exId));
  },

  onSetW(e: Ev) {
    const { exid, idx } = e.currentTarget.dataset;
    const w = parseWeight(e.detail.value ?? '');
    this.edit((d) => updateSet(d, exid, Number(idx), { w }, Date.now()));
  },

  onSetR(e: Ev) {
    const { exid, idx } = e.currentTarget.dataset;
    const r = parseReps(e.detail.value ?? '');
    this.edit((d) => updateSet(d, exid, Number(idx), { r }, Date.now()));
  },

  /** 打勾：整行变色；破了纪录当场给奖杯（加重振动 + 只放数字的 toast）；并开始组间休息 */
  onToggleSetDone(e: Ev) {
    const { exid, idx } = e.currentTarget.dataset;
    const c = ctx();
    const today = c.today();
    const before = c.days.getOrEmpty(today);
    const cur = setsOf(before, exid)[Number(idx)];
    if (!cur) return;
    const now = Date.now();
    this.edit((d) => updateSet(d, exid, Number(idx), { done: !cur.done }, now));
    if (cur.done) return;
    const hist = historyOf(today);
    const prAfter = exercisePR(c.days.getOrEmpty(today), hist, exid);
    if (prAfter && !samePR(exercisePR(before, hist, exid), prAfter)) {
      wx.vibrateShort({ type: 'medium' });
      toast(this, '新纪录 ' + prShort(prAfter));
    } else {
      wx.vibrateShort({ type: 'light' });
    }
    const ex = exerciseById(exid);
    if (ex) {
      restClock.start(exid, restSeconds(ex), now);
      this.onTick();
    }
  },

  onRestAdjust(e: Ev) {
    restClock.adjust(Number(e.currentTarget.dataset.d), Date.now());
    this.onTick();
  },

  onSkipRest() {
    restClock.skip();
    this.onTick();
  },

  onCardioType(e: Ev) {
    const type = e.currentTarget.dataset.type as CardioTypeId;
    this.edit((d) => setCardio(d, { type }));
  },

  onCardioMins(e: Ev) {
    const v = parseReps(e.detail.value ?? '');
    this.edit((d) => setCardio(d, { mins: v > 0 ? Math.min(600, v) : null }));
  },

  onCardioKcal(e: Ev) {
    const v = parseReps(e.detail.value ?? '');
    this.edit((d) => setCardio(d, { kcal: v > 0 ? Math.min(3000, v) : null, source: 'device' }));
  },

  onUseEst(e: Ev) {
    const est = Number(e.currentTarget.dataset.est);
    this.edit((d) => setCardio(d, { kcal: est, source: 'estimate' }));
  },

  onComplete() {
    if (!this.data.vm) return;
    if (!this.data.vm.complete.enabled) {
      toast(this, '先打勾 1 组');
      return;
    }
    restClock.skip();
    this.edit((d) => setDone(d, true, Date.now()));
    this.onTick();
    if (this.data.motion) {
      this.setData({ refill: true });
      setTimeout(() => this.setData({ refill: false }), 1200);
    }
    const c = ctx();
    const s = computeStreak(c.days.doneDayKeys(), c.today());
    wx.vibrateShort({ type: 'medium' });
    toast(this, `训练完成 · 已坚持 ${s.persistDays} 天`);
    if (FEATURES.badges) {
      queue = checkBadges(c);
      if (queue.length) setTimeout(() => this.showNextBadge(), 600);
    }
  },

  onUndo() {
    this.edit((d) => setDone(d, false, Date.now()));
  },

  onGoRec() {
    navFlags.resetRec = true;
    wx.switchTab({ url: '/pages/rec/rec' });
  },

  onPoster() {
    wx.navigateTo({ url: '/pkg-share/pages/poster/poster?type=checkin' });
  },

  async onRemind() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    const title = this.data.vm ? this.data.vm.suggest.text.replace(/^推荐练/, '') : '训练';
    const ok = await requestTrainReminder(ctx(), `今天练${title}`, tomorrow.getTime());
    toast(this, ok ? '好的，明天 19:00 提醒你' : '没有开启提醒');
  },

  onShareAppMessage(res: WechatMiniprogram.Page.IShareAppMessageOption) {
    const target = res.target as { dataset?: Record<string, string> } | undefined;
    const id = res.from === 'button' && target && target.dataset && target.dataset.share === 'badge' ? target.dataset.id : '';
    const b = id ? badgeById(id) : undefined;
    if (!b) return { title: '健身达人 · 一起练', path: '/pages/today/today' };
    const c = ctx();
    const base = { title: `我在健身达人拿到了「${b.name}」徽章`, path: '/pages/today/today' };
    return { ...base, promise: createShare(c.api, 'badge', { badgeId: b.id }).then((sid) => (sid ? { ...base, path: sharePath(sid) } : base)) };
  },
});
