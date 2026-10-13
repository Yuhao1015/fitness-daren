import type { IAppOption } from '../../../app';
import { mdText } from '../../../core/date';
import { listPosters } from '../../../services/album';

interface Ev {
  currentTarget: { dataset: Record<string, any> };
}

const ctx = () => getApp<IAppOption>().ctx;

Page({
  data: { groups: [] as { key: string; month: string; items: { key: string; id: string; title: string; date: string; report: boolean }[] }[] },
  onShow() {
    const groups: Record<string, { key: string; month: string; items: { key: string; id: string; title: string; date: string; report: boolean }[] }> = {};
    for (const p of listPosters(ctx().storage)) {
      const m = p.date.slice(0, 7);
      if (!groups[m]) groups[m] = { key: m, month: `${Number(m.slice(0, 4))} 年 ${Number(m.slice(5))} 月`, items: [] };
      groups[m].items.push({ key: p.id, id: p.id, title: p.title, date: mdText(p.date), report: p.type === 'report' });
    }
    this.setData({ groups: Object.values(groups) });
  },
  onOpen(e: Ev) {
    wx.navigateTo({ url: `/pkg-share/pages/poster/poster?album=${e.currentTarget.dataset.id}` });
  },
  onBack() {
    wx.navigateBack();
  },
});
