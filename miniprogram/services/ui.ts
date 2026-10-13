type AnyInstance = WechatMiniprogram.Page.TrivialInstance | WechatMiniprogram.Component.TrivialInstance;

/** action：可选的按钮文字（如「撤回」），点击时页面上 <toast bind:action> 收到事件 */
export function toast(page: AnyInstance, msg: string, action = ''): void {
  const t = page.selectComponent('#toast') as unknown as { show?: (m: string, a?: string) => void } | null;
  if (t && typeof t.show === 'function') t.show(msg, action);
}

export function setTab(page: WechatMiniprogram.Page.TrivialInstance, idx: number): void {
  const tb = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (tb) tb.setData({ selected: idx });
}

export function setTabDot(page: WechatMiniprogram.Page.TrivialInstance, idx: number, on: boolean): void {
  const tb = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (tb) tb.setData({ [`dots[${idx}]`]: on });
}
