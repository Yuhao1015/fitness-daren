import type { IAppOption } from '../../../app';
import type { Goal, WeeklyTarget } from '../../../core/types';
import { createAppContext } from '../../../services/app-context';
import { motionOff, setMotionOff } from '../../../services/badges';
import { WxStorage } from '../../../services/store';
import { toast } from '../../../services/ui';
import { chip } from '../../../viewmodels/common';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
  detail: { value?: string };
}

const ctx = () => getApp<IAppOption>().ctx;

function view() {
  const c = ctx();
  const p = c.profile.get();
  return {
    goals: ([['bulk', '增肌'], ['cut', '减脂'], ['maintain', '保持体能']] as [Goal, string][]).map(([id, l]) => chip(id, l, p.goal === id)),
    targets: ([2, 3, 4, 5] as WeeklyTarget[]).map((n) => chip(String(n), n === 5 ? '5 次以上' : `${n} 次`, p.weeklyTarget === n)),
    bodyweight: p.bodyweightKg == null ? '' : String(p.bodyweightKg),
    motion: !motionOff(c.storage),
    hasCloud: !!c.api,
  };
}

Page({
  // 不在模块加载时读 ctx：App 的 onLaunch 之前页面模块就可能被执行
  data: { goals: [] as ReturnType<typeof view>['goals'], targets: [] as ReturnType<typeof view>['targets'], bodyweight: '', motion: true, hasCloud: false },

  onShow() {
    this.setData(view());
  },

  onGoal(e: Ev) {
    ctx().profile.update({ goal: e.currentTarget.dataset.id as Goal });
    ctx().syncSoon();
    this.setData(view());
  },

  onTarget(e: Ev) {
    ctx().profile.update({ weeklyTarget: Number(e.currentTarget.dataset.id) as WeeklyTarget });
    ctx().syncSoon();
    this.setData(view());
  },

  onWeight(e: Ev) {
    const v = parseFloat((e.detail.value ?? '').trim());
    ctx().profile.update({ bodyweightKg: Number.isFinite(v) && v >= 25 && v <= 300 ? Math.round(v * 10) / 10 : null });
    ctx().syncSoon();
    this.setData(view());
  },

  onMotion() {
    const c = ctx();
    setMotionOff(c.storage, !motionOff(c.storage));
    this.setData(view());
  },

  async onExport() {
    const c = ctx();
    const data = c.api ? await c.api.call('users.export').catch(() => null) : { profile: c.profile.get(), days: c.days.all() };
    if (!data) {
      toast(this, '导出失败，请稍后再试');
      return;
    }
    wx.setClipboardData({ data: JSON.stringify(data), success: () => toast(this, '已复制到剪贴板，可粘贴保存') });
  },

  onDelete() {
    wx.showModal({
      title: '注销并删除数据？',
      content: '会删除这台手机和云端的全部训练、饮食、海报与社交数据，无法恢复。',
      confirmText: '删除',
      confirmColor: '#B5523B',
      success: async (r) => {
        if (!r.confirm) return;
        const c = ctx();
        if (c.api) {
          try {
            await c.api.call('users.delete');
          } catch (e) {
            toast(this, '云端删除失败，请稍后再试');
            return;
          }
        }
        wx.clearStorageSync();
        // reLaunch 不会重建 App 实例：重建上下文，丢掉 DayRepo 的内存分片缓存
        getApp<IAppOption>().ctx = createAppContext(new WxStorage(), c.api);
        wx.reLaunch({ url: '/pages/today/today' });
      },
    });
  },

  onPrivacy() {
    wx.openPrivacyContract({});
  },
});
