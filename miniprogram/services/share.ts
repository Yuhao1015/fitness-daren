import type { CloudApi } from './sync';

export type ShareType = 'poster' | 'dish' | 'plan' | 'badge' | 'persona' | 'challenge' | 'buddy';

export interface ShareInfo {
  type: ShareType;
  payload: Record<string, any>;
  sharer: { nickname: string; avatarUrl: string };
  isMine: boolean;
}

export async function createShare(api: CloudApi | null, type: ShareType, payload: Record<string, unknown>): Promise<string | null> {
  if (!api) return null;
  try {
    return (await api.call<{ shareId: string }>('share.create', { type, payload })).shareId;
  } catch (e) {
    console.warn('[share] create failed', e);
    return null;
  }
}

export async function fetchShare(api: CloudApi | null, id: string): Promise<ShareInfo | null> {
  if (!api) return null;
  try {
    return await api.call<ShareInfo>('share.get', { shareId: id });
  } catch (e) {
    return null;
  }
}

export function markOpened(api: CloudApi | null, id: string): void {
  if (api) api.call('share.open', { shareId: id }).catch((e) => console.warn('[share] open failed', e));
}

/** 小程序码落到本地临时文件；任何失败都返回 null，海报改用「微信搜索」文案 */
export async function qrLocalPath(api: CloudApi | null, id: string): Promise<string | null> {
  if (!api) return null;
  try {
    const { fileID } = await api.call<{ fileID: string }>('share.qrcode', { shareId: id });
    return (await wx.cloud.downloadFile({ fileID })).tempFilePath;
  } catch (e) {
    console.warn('[share] qrcode failed', e);
    return null;
  }
}
