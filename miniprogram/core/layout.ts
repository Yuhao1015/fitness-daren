export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/** 页头内容放在右上角胶囊按钮下方 6px（spec §9.4）；拿不到胶囊信息时退回 状态栏 + 44 */
export function headerLayout(windowWidth: number, statusBarHeight: number, menu: Rect | null): { paddingTop: number } {
  void windowWidth;
  if (!menu || !menu.bottom) return { paddingTop: statusBarHeight + 44 };
  return { paddingTop: menu.bottom + 6 };
}
