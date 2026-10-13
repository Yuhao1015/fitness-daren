import type { StorageAdapter } from './store';

export interface PosterRecord {
  id: string;
  type: 'checkin' | 'report';
  date: string;
  title: string;
  data: Record<string, unknown>;
}

const KEY = 'posters';
const MAX = 60;

export function listPosters(s: StorageAdapter): PosterRecord[] {
  return s.get<PosterRecord[]>(KEY) ?? [];
}

export function savePosterRecord(s: StorageAdapter, rec: PosterRecord): void {
  const rest = listPosters(s).filter((p) => !(p.type === rec.type && p.date === rec.date));
  s.set(KEY, [rec, ...rest].slice(0, MAX));
}

export function getPoster(s: StorageAdapter, id: string): PosterRecord | undefined {
  return listPosters(s).find((p) => p.id === id);
}

/** 保存到相册；用户拒绝过授权时引导去设置页 */
export function saveToAlbum(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(true),
      fail: (e) => {
        if (/auth deny|auth denied|authorize/.test(e.errMsg)) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存海报需要「添加到相册」权限，去设置里打开后再试一次。',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting({});
            },
          });
        }
        resolve(false);
      },
    });
  });
}
