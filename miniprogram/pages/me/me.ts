import type { IAppOption } from '../../app';
import { FEATURES, SUBSCRIBE_TEMPLATES } from '../../config';
import { buildInboxVM } from '../../core/inbox';
import { sharePath } from '../../core/share-link';
import { isDoneDay } from '../../core/workout';
import { badgeInput } from '../../services/badges';
import { createShare } from '../../services/share';
import { UPDATABLE_TEMPLATE_START, saveSocialStats, socialApi, type BuddyItem, type ChallengeView } from '../../services/social';
import { setTab, setTabDot, toast } from '../../services/ui';
import { DEFAULT_ME_UI, MUSCLE_WEEKS_BACK, buildMeVM, type MeUI, type MeVM } from '../../viewmodels/me';
import { buildSocialVM, type SheetState, type SocialVM } from '../../viewmodels/social';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;
let ui: MeUI = { ...DEFAULT_ME_UI };
let view: 'data' | 'social' = 'data';
let challenges: ChallengeView[] = [];
let buddies: BuddyItem[] = [];
let openId: string | null = null;
let sheet: SheetState = { open: false, days: 7, rule: 'daily', rankBy: 'days' };
let infoOpen: string | null = null;
let inbox = buildInboxVM([], 0);

Page({
  data: {
    vm: null as MeVM | null,
    social: null as SocialVM | null,
    inbox,
    view: view as 'data' | 'social',
    features: FEATURES,
    hasCloud: false,
  },

  onShow() {
    setTab(this, 4);
    this.refresh();
    this.loadRemote();
  },

  refresh() {
    const c = ctx();
    const vm = buildMeVM({
      today: c.today(), all: c.days.all(), lookup: c.days.lookup, doneKeys: c.days.doneDayKeys(), profile: c.profile.get(), ui,
      badges: FEATURES.badges ? badgeInput(c) : undefined,
    });
    const social = buildSocialVM({ challenges, openId, buddies, profile: c.profile.get(), infoOpen, sheet });
    const meDone = isDoneDay(c.days.get(c.today()));
    social.buddies.forEach((b) => (b.canDuo = meDone && b.trained));
    this.setData({ vm, social, inbox, view, hasCloud: !!c.api });
  },

  async loadRemote() {
    const c = ctx();
    if (!c.api || !FEATURES.social) return;
    const api = socialApi(c.api);
    const today = c.today();
    try {
      const [box, st, mine, bl] = await Promise.all([api.inbox(), api.stats(), api.mine(today), api.buddies(today)]);
      inbox = buildInboxVM(box.items, box.unread);
      challenges = mine.challenges;
      buddies = bl.buddies;
      if (!openId && challenges.length) openId = challenges[0].challenge.id;
      saveSocialStats(c.storage, {
        pathfinders: st.converts,
        buddies: buddies.length,
        challengesDone: challenges.filter((v) => v.challenge.status === 'ended' && v.me && v.me.complete).length,
      });
      setTabDot(this, 4, box.unread > 0);
      this.refresh();
    } catch (e) {
      console.warn('[me] load social failed', e);
    }
  },

  /* ---------- 数据子页（与 P2/P3 相同） ---------- */
  onHeat(e: Ev) {
    const vm = this.data.vm;
    const k = e.currentTarget.dataset.key as string;
    if (!vm || vm.heat.find((h) => h.key === k)?.future) return;
    ui = { ...ui, heatSel: k };
    this.refresh();
  },
  onLift(e: Ev) {
    ui = { ...ui, prog: e.currentTarget.dataset.id as string, progSel: null };
    this.refresh();
  },
  /** 本周肌群图：往前 / 往后翻一周（最多回看 11 周） */
  onMuscleWeek(e: Ev) {
    const next = ui.muscleWeek + Number(e.currentTarget.dataset.d);
    if (next > 0 || next < -MUSCLE_WEEKS_BACK) return;
    ui = { ...ui, muscleWeek: next };
    this.refresh();
  },
  onPoint(e: Ev) {
    ui = { ...ui, progSel: e.currentTarget.dataset.date as string };
    this.refresh();
  },
  onInfo(e: Ev) {
    const k = e.currentTarget.dataset.key as string;
    ui = { ...ui, infoOpen: ui.infoOpen === k ? null : k };
    infoOpen = infoOpen === k ? null : k;
    this.refresh();
  },
  onReport() {
    const vm = this.data.vm;
    if (!vm) return;
    if (!vm.month.report.unlocked || !FEATURES.poster) {
      toast(this, vm.month.report.label);
      return;
    }
    wx.navigateTo({ url: '/pkg-share/pages/poster/poster?type=report' });
  },
  onDishBook() {
    wx.navigateTo({ url: '/pkg-share/pages/dishbook/dishbook' });
  },
  onAlbum() {
    wx.navigateTo({ url: '/pkg-share/pages/album/album' });
  },
  onBadges() {
    wx.navigateTo({ url: '/pkg-share/pages/badges/badges' });
  },
  onPersona() {
    wx.navigateTo({ url: '/pkg-share/pages/persona/persona' });
  },
  onSettings() {
    wx.navigateTo({ url: '/pkg-social/pages/settings/settings' });
  },
  async onInboxOpen() {
    const c = ctx();
    if (!c.api || !inbox.unread) return;
    await socialApi(c.api).readInbox().catch(() => undefined);
    inbox = { ...inbox, unread: 0, items: inbox.items.map((x) => ({ ...x, unread: false })) };
    setTabDot(this, 4, false);
    this.refresh();
  },

  /* ---------- 子页切换 ---------- */
  onView(e: Ev) {
    view = e.currentTarget.dataset.id === 'social' ? 'social' : 'data';
    this.refresh();
  },

  /* ---------- 挑战 ---------- */
  onOpenChallenge(e: Ev) {
    const id = e.currentTarget.dataset.id as string;
    openId = openId === id ? null : id;
    this.refresh();
  },
  onSheetOpen() {
    sheet = { ...sheet, open: true };
    this.refresh();
  },
  onSheetClose() {
    sheet = { ...sheet, open: false };
    this.refresh();
  },
  onSheetPick(e: Ev) {
    const { field, id } = e.currentTarget.dataset as { field: keyof SheetState; id: string };
    sheet = { ...sheet, [field]: field === 'days' ? Number(id) : id } as SheetState;
    this.refresh();
  },
  async onCreateChallenge() {
    const c = ctx();
    if (!c.api) return;
    try {
      const r = await socialApi(c.api).create({ days: sheet.days, rule: sheet.rule, rankBy: sheet.rankBy, today: c.today() });
      if (r.activityId) {
        wx.updateShareMenu({
          withShareTicket: true,
          isUpdatableMessage: true,
          activityId: r.activityId,
          templateInfo: { templateId: UPDATABLE_TEMPLATE_START, parameterList: [{ name: 'member_count', value: '1' }, { name: 'room_limit', value: '50' }] },
        });
      }
      sheet = { ...sheet, open: false };
      openId = r.challengeId;
      toast(this, '挑战已创建，点「发到群里」邀请大家');
      await this.loadRemote();
    } catch (e) {
      toast(this, '创建失败，请稍后再试');
    }
  },
  onSettle(e: Ev) {
    wx.navigateTo({ url: `/pkg-share/pages/poster/poster?type=settle&cid=${e.currentTarget.dataset.id}` });
  },

  /* ---------- 搭子 ---------- */
  async onBuddyAct(e: Ev) {
    const c = ctx();
    if (!c.api) return;
    const b = buddies.find((x) => x.id === e.currentTarget.dataset.id);
    if (!b) return;
    const api = socialApi(c.api);
    if (b.trainedToday) {
      const r = await api.like(b.id, c.today());
      b.liked = r.liked;
    } else if (!b.nudged) {
      const r = await api.nudge(b.id, c.today());
      b.nudged = true;
      toast(this, r.delivered === 'push' ? `已提醒${b.name}` : `已拍一拍${b.name}，TA 打开小程序时会看到`);
    }
    this.refresh();
  },
  onDuo(e: Ev) {
    wx.navigateTo({ url: `/pkg-share/pages/poster/poster?type=duo&pair=${e.currentTarget.dataset.id}` });
  },
  onTogglePrivacy() {
    const c = ctx();
    c.profile.update({ shareDetailToBuddies: !c.profile.get().shareDetailToBuddies });
    c.syncSoon();
    this.refresh();
  },
  /** 客户端订阅的模板必须与云端 TPL_NUDGE 是同一个 */
  async onAllowNudge() {
    const c = ctx();
    const tmpl = SUBSCRIBE_TEMPLATES.nudge;
    if (!c.api || !tmpl) {
      toast(this, '提醒功能还没开放');
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [tmpl],
      success: async (r: Record<string, string>) => {
        if (r[tmpl] === 'accept') {
          await socialApi(c.api!).grant('nudge');
          toast(this, '好的，搭子拍你时会收到一次提醒');
        }
      },
    });
  },

  /* ---------- 分享 ---------- */
  onShareAppMessage(res: WechatMiniprogram.Page.IShareAppMessageOption) {
    const c = ctx();
    const target = res.target as { dataset?: Record<string, string> } | undefined;
    const kind = res.from === 'button' && target && target.dataset ? target.dataset.share : '';
    if (kind === 'challenge' && target && target.dataset) {
      const cid = target.dataset.id;
      const v = challenges.find((x) => x.challenge.id === cid);
      const base = { title: `一起参加「${v ? v.challenge.title : '打卡挑战'}」，坚持就有专属徽章`, path: '/pages/today/today' };
      return { ...base, promise: createShare(c.api, 'challenge', { challengeId: cid }).then((id) => (id ? { ...base, path: sharePath(id) } : base)) };
    }
    if (kind === 'buddy') {
      const base = { title: '做我的健身搭子吧，互相看得到每天有没有练', path: '/pages/today/today' };
      return { ...base, promise: createShare(c.api, 'buddy', {}).then((id) => (id ? { ...base, path: sharePath(id) } : base)) };
    }
    return { title: '健身达人', path: '/pages/today/today' };
  },
});
