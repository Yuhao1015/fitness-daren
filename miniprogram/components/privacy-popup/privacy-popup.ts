type Resolve = (r: { buttonId?: string; event: 'agree' | 'disagree' }) => void;
const resolvers = new WeakMap<object, Resolve>();

Component({
  options: { addGlobalClass: true },
  data: { show: false },
  lifetimes: {
    attached() {
      if (typeof wx.onNeedPrivacyAuthorization !== 'function') return;
      // miniprogram-api-typings 5.x 把首个参数错标成 GeneralCallbackResult；官方文档写明它是 resolve 函数
      wx.onNeedPrivacyAuthorization((resolve) => {
        resolvers.set(this, resolve as unknown as Resolve);
        this.setData({ show: true });
      });
    },
  },
  methods: {
    onAgree() {
      const r = resolvers.get(this);
      if (r) r({ buttonId: 'privacy-agree', event: 'agree' });
      this.setData({ show: false });
    },
    onDisagree() {
      const r = resolvers.get(this);
      if (r) r({ event: 'disagree' });
      this.setData({ show: false });
    },
    onOpenContract() {
      wx.openPrivacyContract({});
    },
  },
});
