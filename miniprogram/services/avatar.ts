import { cloudEnabled } from './cloud';

/** chooseAvatar 返回的是临时路径，必须落到持久位置 */
export async function persistAvatar(tempPath: string): Promise<string> {
  if (cloudEnabled()) {
    const res = await wx.cloud.uploadFile({ cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, filePath: tempPath });
    return res.fileID;
  }
  return new Promise((resolve) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      success: (r) => resolve(r.savedFilePath),
      fail: () => resolve(tempPath),
    });
  });
}
