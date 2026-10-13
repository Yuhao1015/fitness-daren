import type { IAppOption } from '../../../app';
import { badgeStats, badgeWallVM } from '../../../core/badges';
import { loadDishBook } from '../../../core/collection';
import { loadOwned } from '../../../services/badges';
import { loadSocialStats } from '../../../services/social';

const ctx = () => getApp<IAppOption>().ctx;

Page({
  data: { vm: null as ReturnType<typeof badgeWallVM> | null },
  onShow() {
    const c = ctx();
    const stats = badgeStats({ all: c.days.all(), doneKeys: c.days.doneDayKeys(), today: c.today(), dishCount: Object.keys(loadDishBook(c.storage)).length, social: loadSocialStats(c.storage) });
    this.setData({ vm: badgeWallVM(stats, loadOwned(c.storage)) });
  },
  onBack() {
    wx.navigateBack();
  },
});
