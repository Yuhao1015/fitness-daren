const TABS = [
  { path: '/pages/today/today', label: '今日', icon: 'tab-today' },
  { path: '/pages/calendar/calendar', label: '日历', icon: 'tab-cal' },
  { path: '/pages/food/food', label: '饮食', icon: 'tab-food' },
  { path: '/pages/rec/rec', label: '推荐', icon: 'tab-rec' },
  { path: '/pages/me/me', label: '我的', icon: 'tab-me' },
];

Component({
  options: { addGlobalClass: true },
  data: { selected: 0, dots: [false, false, false, false, false], tabs: TABS.map((t) => ({ ...t, key: t.path })) },
  methods: {
    onTap(e: WechatMiniprogram.TouchEvent) {
      const idx = Number(e.currentTarget.dataset.idx);
      wx.switchTab({ url: TABS[idx].path });
    },
  },
});
