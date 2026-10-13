const COLORS = ['#3B6FB6', '#E07B39', '#8A63C7', '#2A9D8F', '#B5523B', '#C99A1E', '#D1497A'];

Component({
  options: { addGlobalClass: true },
  properties: {
    show: { type: Boolean, value: false },
    badgeId: { type: String, value: '' },
    name: { type: String, value: '' },
    desc: { type: String, value: '' },
    icon: { type: String, value: 'trophy' },
    color: { type: String, value: '#2E7D4F' },
    motion: { type: Boolean, value: true },
  },
  data: { bits: [] as { key: string; left: number; delay: number; color: string; rot: number }[] },
  observers: {
    show(show: boolean) {
      if (!show) return;
      this.setData({
        bits: Array.from({ length: 24 }, (_, i) => ({ key: String(i), left: Math.round(Math.random() * 100), delay: Math.round(Math.random() * 300), color: COLORS[i % COLORS.length], rot: Math.round(Math.random() * 360) })),
      });
    },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
  },
});
