import type { IAppOption } from '../../../app';
import { headerLayout } from '../../../core/layout';
import { weeklyPlan } from '../../../core/plan';
import type { Goal, WeeklyTarget } from '../../../core/types';
import { persistAvatar } from '../../../services/avatar';
import { chip } from '../../../viewmodels/common';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
  detail: { value?: string; avatarUrl?: string };
}

const GOALS: [Goal, string, string][] = [
  ['bulk', '增肌', 'tab-today'],
  ['cut', '减脂', 'flame'],
  ['maintain', '保持体能', 'part-cardio'],
];
const TARGETS: WeeklyTarget[] = [2, 3, 4, 5];
const ctx = () => getApp<IAppOption>().ctx;

let form = { goal: 'maintain' as Goal, weeklyTarget: 3 as WeeklyTarget, bodyweightKg: null as number | null, nickname: '', avatarUrl: '' };

function view(step: number) {
  return {
    step,
    goals: GOALS.map(([id, label, icon]) => chip(id, label, form.goal === id, '', icon)),
    targets: TARGETS.map((n) => chip(String(n), n === 5 ? '5+' : String(n), form.weeklyTarget === n)),
    bodyweight: form.bodyweightKg == null ? '' : String(form.bodyweightKg),
    nickname: form.nickname,
    avatarUrl: form.avatarUrl,
  };
}

Page({
  data: { padTop: 54, ...view(0) },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({ padTop: headerLayout(win.windowWidth, win.statusBarHeight, wx.getMenuButtonBoundingClientRect()).paddingTop });
  },

  onGoal(e: Ev) {
    form = { ...form, goal: e.currentTarget.dataset.id as Goal };
    this.setData(view(this.data.step));
  },

  onTarget(e: Ev) {
    form = { ...form, weeklyTarget: Number(e.currentTarget.dataset.id) as WeeklyTarget };
    this.setData(view(this.data.step));
  },

  onWeight(e: Ev) {
    const v = parseFloat((e.detail.value ?? '').trim());
    form = { ...form, bodyweightKg: Number.isFinite(v) && v >= 25 && v <= 300 ? Math.round(v * 10) / 10 : null };
    this.setData(view(this.data.step));
  },

  onNick(e: Ev) {
    form = { ...form, nickname: (e.detail.value ?? '').trim().slice(0, 20) };
  },

  async onAvatar(e: Ev) {
    const temp = e.detail.avatarUrl;
    if (!temp) return;
    form = { ...form, avatarUrl: temp };
    this.setData(view(this.data.step));
    try {
      form = { ...form, avatarUrl: await persistAvatar(temp) };
    } catch (err) {
      console.warn('[avatar] persist failed', err);
    }
  },

  onNext() {
    this.setData(view(Math.min(3, this.data.step + 1)));
  },

  onBack() {
    this.setData(view(Math.max(0, this.data.step - 1)));
  },

  onFinish() {
    const c = ctx();
    c.profile.update({
      goal: form.goal,
      weeklyTarget: form.weeklyTarget,
      bodyweightKg: form.bodyweightKg,
      nickname: form.nickname || null,
      avatarUrl: form.avatarUrl || null,
      onboardedAt: Date.now(),
    });
    c.days.putMany(weeklyPlan(form.weeklyTarget, c.today(), c.days.lookup));
    c.syncSoon();
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/today/today' }) });
  },
});
