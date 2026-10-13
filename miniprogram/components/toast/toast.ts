const timers = new WeakMap<object, number>();

Component({
  options: { addGlobalClass: true },
  data: { msg: '', action: '', visible: false },
  methods: {
    /** action 不为空时多显示一个按钮，停留时间也更长，点了向页面发 action 事件 */
    show(msg: string, action = '') {
      const old = timers.get(this);
      if (old !== undefined) clearTimeout(old);
      this.setData({ msg, action, visible: true });
      timers.set(this, setTimeout(() => this.setData({ visible: false }), action ? 3200 : 1800));
    },
    onAct() {
      const old = timers.get(this);
      if (old !== undefined) clearTimeout(old);
      this.setData({ visible: false });
      this.triggerEvent('action');
    },
  },
  lifetimes: {
    detached() {
      const old = timers.get(this);
      if (old !== undefined) clearTimeout(old);
    },
  },
});
