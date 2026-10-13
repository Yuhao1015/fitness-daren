import { headerLayout, type Rect } from '../../core/layout';

Component({
  options: { addGlobalClass: true },
  properties: {
    over: { type: String, value: '' },
    title: { type: String, value: '' },
    num: { type: String, value: '' },
    numLabel: { type: String, value: '' },
    /** 数字左边的图标（今日页选部位时是火焰），空 = 不显示 */
    icon: { type: String, value: '' },
    /** 数字下方的小月亮：还能休几天链不断（{key, on}[]），空数组 = 不显示 */
    moons: { type: Array, value: [] },
    /** 火焰轻轻跳动：今天不练明天就断（受「关闭动效」控制，由页面传入） */
    pulse: { type: Boolean, value: false },
  },
  data: { padTop: 54 },
  lifetimes: {
    attached() {
      const win = wx.getWindowInfo();
      let menu: Rect | null = null;
      try {
        menu = wx.getMenuButtonBoundingClientRect();
      } catch (e) {
        menu = null;
      }
      this.setData({ padTop: headerLayout(win.windowWidth, win.statusBarHeight, menu).paddingTop });
    },
  },
});
