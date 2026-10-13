import type { IAppOption } from '../../app';
import { templateById, type PartId } from '../../core/catalog';
import { mdText } from '../../core/date';
import { setDone, togglePart } from '../../core/day-ops';
import { applyTemplate, applyTemplateToast, planStart } from '../../core/plan';
import { sharePath } from '../../core/share-link';
import { createShare } from '../../services/share';
import { setTab, toast } from '../../services/ui';
import { buildCalendarVM, selectAfterShift, shiftMonth, type CalendarVM } from '../../viewmodels/calendar';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let view = { year: 0, month0: 0, sel: '', infoOpen: null as string | null };
let pendingTpl = '';

function resetToToday(): void {
  const t = ctx().today();
  view = { ...view, year: Number(t.slice(0, 4)), month0: Number(t.slice(5, 7)) - 1, sel: t };
}

Page({
  data: { vm: null as CalendarVM | null },

  onLoad(q: Record<string, string | undefined>) {
    if (q.tpl) pendingTpl = q.tpl;
  },

  onShow() {
    setTab(this, 1);
    if (!view.sel) resetToToday();
    this.refresh();
    if (pendingTpl) this.confirmSharedTemplate();
  },

  refresh() {
    const c = ctx();
    this.setData({ vm: buildCalendarVM({ today: c.today(), ...view, lookup: c.days.lookup, bodyweightKg: c.profile.get().bodyweightKg }) });
  },

  confirmSharedTemplate() {
    const id = pendingTpl;
    pendingTpl = '';
    let tpl;
    try {
      tpl = templateById(id);
    } catch (e) {
      return;
    }
    const c = ctx();
    wx.showModal({
      title: '套用好友分享的计划？',
      content: `「${tpl.name}」将从 ${mdText(c.today())} 起排入 7 天，已有安排的日子不会被覆盖。`,
      confirmText: '套用',
      success: (r) => {
        if (!r.confirm) return;
        const res = applyTemplate(c.days.lookup, tpl, c.today());
        c.days.putMany(res.updates);
        c.syncSoon();
        this.refresh();
        toast(this, applyTemplateToast(tpl, res.count));
      },
    });
  },

  onPrev() {
    const m = shiftMonth(view.year, view.month0, -1);
    view = { ...view, ...m, sel: selectAfterShift(ctx().today(), m.year, m.month0) };
    this.refresh();
  },

  onNext() {
    const m = shiftMonth(view.year, view.month0, 1);
    view = { ...view, ...m, sel: selectAfterShift(ctx().today(), m.year, m.month0) };
    this.refresh();
  },

  onBackToday() {
    resetToToday();
    this.refresh();
  },

  onInfo(e: Ev) {
    const k = e.currentTarget.dataset.key as string;
    view = { ...view, infoOpen: view.infoOpen === k ? null : k };
    this.refresh();
  },

  onPickDay(e: Ev) {
    view = { ...view, sel: e.currentTarget.dataset.date as string };
    this.refresh();
  },

  onTogglePart(e: Ev) {
    const c = ctx();
    c.days.update(view.sel, (d) => togglePart(d, e.currentTarget.dataset.pid as PartId));
    c.syncSoon();
    this.refresh();
  },

  onMark() {
    const c = ctx();
    const d = c.days.getOrEmpty(view.sel);
    c.days.put(setDone(d, !d.done, Date.now()));
    c.syncSoon();
    this.refresh();
  },

  onStart() {
    wx.switchTab({ url: '/pages/today/today' });
  },

  onApplyTpl(e: Ev) {
    const c = ctx();
    const tpl = templateById(e.currentTarget.dataset.id as string);
    const res = applyTemplate(c.days.lookup, tpl, planStart(view.sel, c.today()));
    c.days.putMany(res.updates);
    c.syncSoon();
    this.refresh();
    toast(this, applyTemplateToast(tpl, res.count));
  },

  onShareAppMessage(res: WechatMiniprogram.Page.IShareAppMessageOption) {
    const target = res.target as { dataset?: Record<string, string> } | undefined;
    const id = res.from === 'button' && target && target.dataset ? target.dataset.tpl : '';
    if (id) {
      const tpl = templateById(id);
      const base = { title: `我在用「${tpl.name}」练，一键套用到你的日历`, path: `/pages/calendar/calendar?tpl=${id}` };
      const c = ctx();
      if (!c.api) return base;
      return { ...base, promise: createShare(c.api, 'plan', { templateId: id }).then((sid) => (sid ? { ...base, path: sharePath(sid) } : base)) };
    }
    return { title: '健身达人 · 训练日历', path: '/pages/today/today' };
  },
});
