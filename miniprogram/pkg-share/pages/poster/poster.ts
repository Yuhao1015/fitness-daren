import type { IAppOption } from '../../../app';
import { APP_NAME } from '../../../config';
import { headerLayout } from '../../../core/layout';
import { mdText, weekdayText } from '../../../core/date';
import { partById } from '../../../core/catalog';
import type { CheckinPosterData } from '../../../core/poster/checkin';
import { buildDuoPoster, buildSettlePoster } from '../../../core/poster/extra';
import { buildReportPoster, type ReportPosterData } from '../../../core/poster/report';
import { buildStampPoster } from '../../../core/poster/stamp';
import type { PosterSpec, Measure } from '../../../core/poster/types';
import { getPoster, saveToAlbum, savePosterRecord, type PosterRecord } from '../../../services/album';
import { renderToFile } from '../../../services/canvas';
import { newId } from '../../../services/ids';
import { createShare, qrLocalPath } from '../../../services/share';
import { socialApi } from '../../../services/social';
import { toast } from '../../../services/ui';
import { checkinPosterData, reportPosterData } from '../../../viewmodels/poster';

const ctx = () => getApp<IAppOption>().ctx;
let file = '';

async function buildFromQuery(q: Record<string, string | undefined>): Promise<{ title: string; build: (m: Measure) => PosterSpec } | null> {
  const c = ctx();
  const today = c.today();
  if (q.album) {
    const rec = getPoster(c.storage, q.album);
    if (!rec) return null;
    return { title: rec.type === 'checkin' ? '打卡海报' : '本月报告', build: (m) => (rec.type === 'checkin' ? buildStampPoster(rec.data as unknown as CheckinPosterData, m) : buildReportPoster(rec.data as unknown as ReportPosterData, m)) };
  }
  if (q.type === 'settle' && q.cid && c.api) {
    const v = await socialApi(c.api).get(q.cid, today);
    const me = v.me ?? { rank: 0, days: 0, complete: false };
    const id = await createShare(c.api, 'challenge', { challengeId: q.cid });
    const qr = id ? await qrLocalPath(c.api, id) : null;
    return {
      title: '挑战结算',
      build: (m) => buildSettlePoster({
        appName: APP_NAME, title: v.challenge.title, period: `${mdText(v.challenge.startDate)} – ${mdText(v.challenge.endDate)}`,
        rankText: `第 ${me.rank} 名 / ${v.challenge.memberCount} 人`,
        stamp: me.complete ? (me.days >= v.challenge.days ? `${me.days} / ${v.challenge.days} 全勤` : `完成 ${me.days} 天`) : `打卡 ${me.days} 天`,
        complete: me.complete, members: v.rank.map((r) => ({ name: r.name, avatar: r.avatar || null })), qr,
      }, m),
    };
  }
  if (q.type === 'duo' && q.pair && c.api) {
    const list = (await socialApi(c.api).buddies(today)).buddies;
    const b = list.find((x) => x.id === q.pair);
    const day = c.days.get(today);
    if (!b || !day) return null;
    const p = c.profile.get();
    return {
      title: '合体海报',
      build: (m) => buildDuoPoster({
        appName: APP_NAME, date: `${today.replace(/-/g, '.')} ${weekdayText(today)}`,
        a: { name: p.nickname || '我', avatar: p.avatarUrl, line: day.parts.map((x) => partById(x).name).join(' + ') },
        b: { name: b.name, avatar: b.avatar || null, line: b.detail || '今天已练' },
      }, m),
    };
  }
  const type = q.type === 'report' ? 'report' : 'checkin';
  const input = { today, lookup: c.days.lookup, all: c.days.all(), doneKeys: c.days.doneDayKeys(), profile: c.profile.get() };
  // 先生成不含小程序码的数据：它就是分享的 payload，落地页用它重绘同一张海报
  const shareless = type === 'checkin' ? checkinPosterData(input, null) : reportPosterData(input, null);
  let qr: string | null = null;
  if (c.api) {
    const id = await createShare(c.api, 'poster', { kind: type, date: today, data: shareless });
    if (id) qr = await qrLocalPath(c.api, id);
  }
  const data = { ...shareless, qr };
  const rec: PosterRecord = { id: newId('p'), type, date: today, title: type === 'checkin' ? `打卡 ${(data as CheckinPosterData).serial}` : (data as ReportPosterData).title, data: data as unknown as Record<string, unknown> };
  savePosterRecord(c.storage, rec);
  return { title: type === 'checkin' ? '打卡海报' : '本月报告', build: (m) => (type === 'checkin' ? buildStampPoster(data as CheckinPosterData, m) : buildReportPoster(data as ReportPosterData, m)) };
}

Page({
  data: { src: '', title: '海报', loading: true, failed: false, padTop: 54 },

  async onLoad(q: Record<string, string | undefined>) {
    const win = wx.getWindowInfo();
    this.setData({ padTop: headerLayout(win.windowWidth, win.statusBarHeight, wx.getMenuButtonBoundingClientRect()).paddingTop });
    try {
      const job = await buildFromQuery(q);
      if (!job) throw new Error('no poster data');
      this.setData({ title: job.title });
      file = await renderToFile(this, 'poster-canvas', job.build);
      this.setData({ src: file, loading: false });
    } catch (e) {
      console.error('[poster] failed', e);
      this.setData({ loading: false, failed: true });
    }
  },

  onClose() {
    wx.navigateBack();
  },

  onShareImage() {
    if (!file) return;
    wx.showShareImageMenu({ path: file, fail: (e) => console.warn('[poster] share menu', e) });
  },

  async onSave() {
    if (!file) return;
    if (await saveToAlbum(file)) toast(this, '已保存到相册，可以发朋友圈了');
  },
});
