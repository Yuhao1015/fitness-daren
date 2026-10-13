Component({
  options: { addGlobalClass: true },
  properties: {
    icon: { type: String, value: '' },
    fg: { type: String, value: '#1E2A22' },
    bg: { type: String, value: '#FFFFFF' },
    bd: { type: String, value: '#E0EBDE' },
    /** 图标下方的小字（数字、单位），没有就不显示 */
    sub: { type: String, value: '' },
    subFg: { type: String, value: '' },
    /** 读屏用的名称：图标本身不带文字 */
    label: { type: String, value: '' },
    on: { type: Boolean, value: false },
    /** pill = 一排图标的胶囊；tile = 比胶囊高的圆角方块，放肌肉图这类需要看细节的大图标；box = 图标 + 小字的方块 */
    shape: { type: String, value: 'pill' },
    size: { type: Number, value: 46 },
    /** 右上角的小字（部位图块：休息了几天），空 = 不显示 */
    badge: { type: String, value: '' },
    /** 图标变淡（部位 48 小时内刚练过） */
    dim: { type: Boolean, value: false },
  },
});
