import type { IAppOption } from '../../../app';
import { APP_NAME } from '../../../config';
import { badgeById } from '../../../core/badges';
import { templateById } from '../../../core/catalog';
import { collectDish } from '../../../core/collection';
import { addFood } from '../../../core/day-ops';
import { applyTemplate, applyTemplateToast } from '../../../core/plan';
import type { CheckinPosterData } from '../../../core/poster/checkin';
import { buildBadgeCard, buildPersonaCard } from '../../../core/poster/extra';
import { buildReportPoster, type ReportPosterData } from '../../../core/poster/report';
import { buildStampPoster } from '../../../core/poster/stamp';
import { RECIPES, ingredientChips, recipeDraft, recipeMacros } from '../../../core/recipes';
import { parseLanding } from '../../../core/share-link';
import { renderToFile } from '../../../services/canvas';
import { newId } from '../../../services/ids';
import { fetchShare, markOpened, type ShareInfo } from '../../../services/share';
import { socialApi } from '../../../services/social';
import { toast } from '../../../services/ui';

const ctx = () => getApp<IAppOption>().ctx;
let info: ShareInfo | null = null;
let shareId = '';

function goHome(): void {
  wx.switchTab({ url: '/pages/today/today' });
}

/** 从群聊卡片进入时取群标识（spec §9.4），失败返回 undefined */
function groupCloudId(): Promise<unknown> {
  const ticket = wx.getEnterOptionsSync().shareTicket;
  if (!ticket) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    wx.getShareInfo({
      shareTicket: ticket,
      success: (r) => resolve(r.cloudID ? wx.cloud.CloudID(r.cloudID) : undefined),
      fail: () => resolve(undefined),
    });
  });
}

Page({
  data: {
    loading: true,
    type: '',
    sharer: { nickname: '', avatarUrl: '' },
    headline: '',
    primary: '',
    posterSrc: '',
    dish: null as null | { recipeId: string; name: string; kcal: number; p: number; c: number; f: number; tint: string; chips: string[] },
    plan: null as null | { name: string; days: { key: string; label: string; rest: boolean }[] },
    challenge: null as null | { title: string; sub: string },
  },

  async onLoad(q: Record<string, string | undefined>) {
    const id = parseLanding(q);
    const c = ctx();
    if (!id || !c.api) return goHome();
    shareId = id;
    info = await fetchShare(c.api, id);
    if (!info) return goHome();
    markOpened(c.api, id);
    const who = info.sharer.nickname;
    const base = { loading: false, type: info.type, sharer: info.sharer };
    const p = info.payload;

    if (info.type === 'poster') {
      this.setData({ ...base, headline: `${who}今天完成了训练`, primary: '我也练一次' });
      if (p.data) {
        const src = await renderToFile(this, 'landing-canvas', (m) =>
          p.kind === 'report' ? buildReportPoster(p.data as ReportPosterData, m) : buildStampPoster(p.data as CheckinPosterData, m),
        ).catch(() => '');
        this.setData({ posterSrc: src });
      }
    } else if (info.type === 'dish') {
      const r = RECIPES.find((x) => x.id === p.recipeId);
      if (!r) return goHome();
      const m = recipeMacros(r);
      this.setData({ ...base, headline: `${who}练完吃了这个`, primary: '我也记一份', dish: { recipeId: r.id, name: r.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, tint: r.tint, chips: ingredientChips(r) } });
    } else if (info.type === 'plan') {
      let tpl;
      try {
        tpl = templateById(String(p.templateId));
      } catch (e) {
        return goHome();
      }
      this.setData({ ...base, headline: `${who}在用「${tpl.name}」`, primary: '一键套用到我的日历', plan: { name: tpl.name, days: tpl.cycle.map((d, i) => ({ key: String(i), label: d.label, rest: !d.parts.length })) } });
    } else if (info.type === 'badge') {
      const b = badgeById(String(p.badgeId));
      if (!b) return goHome();
      this.setData({ ...base, headline: `${who}拿到了「${b.name}」`, primary: '我也来挑战' });
      const src = await renderToFile(this, 'landing-canvas', (m) => buildBadgeCard({ appName: APP_NAME, name: b.name, desc: b.desc, color: b.color, icon: `/assets/icons/${b.icon}-white.png`, dateText: '' }, m)).catch(() => '');
      this.setData({ posterSrc: src });
    } else if (info.type === 'persona') {
      this.setData({ ...base, headline: `${who}是「${p.name}」`, primary: '30 秒测我的训练人格' });
      const src = await renderToFile(this, 'landing-canvas', (m) => buildPersonaCard({ appName: APP_NAME, name: String(p.name), desc: String(p.desc), color: String(p.color), predicted: !!p.predicted }, m)).catch(() => '');
      this.setData({ posterSrc: src });
    } else if (info.type === 'challenge') {
      try {
        const v = await socialApi(c.api).get(String(p.challengeId), c.today());
        if (v.challenge.status === 'ended') {
          this.setData({ ...base, headline: `「${v.challenge.title}」已经结束了`, primary: '我也练一次', challenge: { title: v.challenge.title, sub: `${v.challenge.memberCount} 人参加` } });
        } else {
          this.setData({ ...base, headline: `${who}邀请你参加「${v.challenge.title}」`, primary: '加入挑战', challenge: { title: v.challenge.title, sub: `已有 ${v.challenge.memberCount} 人参加 · 第 ${v.challenge.dayIndex} / ${v.challenge.days} 天` } });
        }
      } catch (e) {
        return goHome();
      }
    } else if (info.type === 'buddy') {
      this.setData({ ...base, headline: `${who}想和你成为健身搭子`, primary: '和 TA 成为搭子' });
    } else {
      goHome();
    }
  },

  async onPrimary() {
    if (!info) return goHome();
    const c = ctx();
    const p = info.payload;
    if (info.type === 'dish' && this.data.dish) {
      const r = RECIPES.find((x) => x.id === this.data.dish!.recipeId)!;
      const draft = recipeDraft(r);
      const now = Date.now();
      c.days.update(c.today(), (d) => addFood(d, { ...draft, id: newId('f', now), at: now }));
      collectDish(c.storage, r.id, now);
      c.syncSoon();
      toast(this, `已记入今日饮食 +${draft.kcal} kcal`);
      setTimeout(() => wx.switchTab({ url: '/pages/food/food' }), 800);
      return;
    }
    if (info.type === 'plan') {
      const tpl = templateById(String(p.templateId));
      const res = applyTemplate(c.days.lookup, tpl, c.today());
      c.days.putMany(res.updates);
      c.syncSoon();
      toast(this, applyTemplateToast(tpl, res.count));
      setTimeout(() => wx.switchTab({ url: '/pages/calendar/calendar' }), 800);
      return;
    }
    if (info.type === 'persona') {
      wx.redirectTo({ url: '/pkg-share/pages/persona/persona?quiz=1' });
      return;
    }
    if (info.type === 'challenge' && c.api && this.data.primary === '加入挑战') {
      try {
        await socialApi(c.api).join(String(p.challengeId), c.today(), await groupCloudId());
        toast(this, '已加入，完成训练会自动打卡');
      } catch (e) {
        toast(this, '加入失败，请稍后再试');
        return;
      }
      setTimeout(goHome, 800);
      return;
    }
    if (info.type === 'buddy' && c.api) {
      try {
        const r = await socialApi(c.api).accept(shareId);
        toast(this, `你和${r.name}成为了搭子`);
      } catch (e) {
        toast(this, '不能和自己成为搭子');
        return;
      }
      setTimeout(goHome, 800);
      return;
    }
    goHome();
  },

  onSecondary() {
    goHome();
  },
});
