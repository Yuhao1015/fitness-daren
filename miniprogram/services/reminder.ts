import { SUBSCRIBE_TEMPLATES } from '../config';
import type { AppContext } from './app-context';

export function canRemind(ctx: AppContext): boolean {
  return !!ctx.api && !!SUBSCRIBE_TEMPLATES.trainReminder;
}

/** 用户点击后请求一次性订阅；同意后记一次额度，再在云端登记定时提醒（reminder.create 在 Task 10 部署前会失败并返回 false） */
export function requestTrainReminder(ctx: AppContext, title: string, at: number): Promise<boolean> {
  const tmpl = SUBSCRIBE_TEMPLATES.trainReminder;
  return new Promise((resolve) => {
    if (!ctx.api || !tmpl) return resolve(false);
    wx.requestSubscribeMessage({
      tmplIds: [tmpl],
      success: async (r: Record<string, string>) => {
        if (r[tmpl] !== 'accept') return resolve(false);
        try {
          await ctx.api!.call('subscribe.grant', { kind: 'train' });
          await ctx.api!.call('reminder.create', { kind: 'train', title, at });
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      },
      fail: () => resolve(false),
    });
  });
}
