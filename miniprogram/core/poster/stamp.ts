import { fitText, wrapText } from './text';
import { POSTER_W, drawFooter, drawMonthHeat, type CheckinPosterData, type HeatCell } from './checkin';
import { COLORS as K, Canvas2DPlan, type Measure, type PosterSpec } from './types';

/**
 * 邮票版打卡海报：一张带齿孔的邮票放在米色纸上，面值是坚持天数，右下角压一枚斜着的日期邮戳；
 * 本月热力与小程序码放在邮票下面的纸边上。数据结构与经典版 CheckinPosterData 完全相同，
 * 所以相册里的旧海报、分享落地页都能直接用这个排版重绘。
 */
export const PAPER = '#F4EFE2';
const PAPER_LINE = '#D9D2BE';
const MARK = 'rgba(192, 80, 43, 0.86)';
const MARK_SOFT = 'rgba(192, 80, 43, 0.5)';
const CLEAR = 'rgba(255, 255, 255, 0)';

const M = 20; // 纸边
const SW = POSTER_W - M * 2; // 邮票宽
const PAD = 12; // 邮票白边：印刷框到邮票边
const FX = M + PAD; // 印刷框
const FW = SW - PAD * 2;
const CX = FX + 12; // 内容区
const CW = FW - 24;
const HOLE = 4; // 齿孔半径
const PITCH = 12; // 齿孔间距
const MARK_R = 26;
const MARK_ROOM = 36; // 邮票内容区下方留给邮戳的高度（邮戳顶边与内容之间还有 8 的空隙）

/** 沿邮票四边打孔：孔心在边线上，用纸色圆盖掉邮票边缘，边缘就成了锯齿 */
function perforate(c: Canvas2DPlan, x: number, y: number, w: number, h: number): void {
  const nx = Math.max(1, Math.round(w / PITCH));
  const ny = Math.max(1, Math.round(h / PITCH));
  for (let i = 0; i <= nx; i++) {
    const px = i === nx ? x + w : x + (w / nx) * i;
    c.circle(px, y, HOLE, PAPER);
    c.circle(px, y + h, HOLE, PAPER);
  }
  for (let j = 1; j < ny; j++) {
    const py = y + (h / ny) * j;
    c.circle(x, py, HOLE, PAPER);
    c.circle(x + w, py, HOLE, PAPER);
  }
}

/** 用许多短线段拼出波浪线（画布指令里没有曲线） */
function wave(c: Canvas2DPlan, x1: number, x2: number, y: number, amp: number): void {
  const step = 3;
  const period = 12;
  let px = x1;
  let py = y;
  for (let x = x1 + step; x <= x2 + 1e-6; x += step) {
    const ny = y + Math.sin(((x - x1) / period) * Math.PI * 2) * amp;
    c.line(px, py, x, ny, MARK_SOFT, 1.2);
    px = x;
    py = ny;
  }
}

function dateParts(date: string): { year: string; md: string; week: string } {
  const [ymd = '', ...rest] = date.split(' ');
  const m = /^(\d{4})\.(\d{2}\.\d{2})$/.exec(ymd);
  return { year: m ? m[1] : '', md: m ? m[2] : ymd, week: rest.join(' ') };
}

/** 斜 12° 的圆形日期邮戳，左边拖出三条波浪消印线 */
function postmark(c: Canvas2DPlan, cx: number, cy: number, date: string): void {
  const { year, md, week } = dateParts(date);
  c.rotate(cx, cy, -12);
  for (const dy of [-9, 0, 9]) wave(c, cx - MARK_R - 36, cx - MARK_R + 6, cy + dy, 2.2);
  c.circle(cx, cy, MARK_R, CLEAR, MARK, 1.5);
  c.circle(cx, cy, MARK_R - 4, CLEAR, MARK, 0.8);
  if (year) c.text(year, cx, cy - 18, 9, 600, MARK, 'center', 'num');
  c.text(md, cx, cy - 8, 15, 700, MARK, 'center', 'num');
  if (week) c.text(week, cx, cy + 9, 9, 600, MARK, 'center');
  c.restore();
}

/** 热力格子换成适合米色纸的颜色：原来的浅灰绿在米色上几乎看不见 */
function paperHeat(heat: HeatCell[]): HeatCell[] {
  return heat.map((h) => ({ bg: h.bg === K.TRACK ? '#E6DFCB' : h.bg === K.TINT ? '#DCE8CF' : h.bg, ring: h.ring }));
}

export function buildStampPoster(d: CheckinPosterData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  // 纸、邮票、印刷框先入列，高度在排版结束后回填
  const paper = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: PAPER, stroke: null, sw: 0 };
  const body = { k: 'rect' as const, x: M, y: 0, w: SW, h: 0, r: 0, fill: '#FFFFFF', stroke: null, sw: 0 };
  const frame = { k: 'rect' as const, x: FX, y: 0, w: FW, h: 0, r: 6, fill: null, stroke: K.GREEN, sw: 1.25 };
  c.ops.push(paper, body, frame);

  const sy = 26;
  const fy = sy + PAD;
  body.y = sy;
  frame.y = fy;
  let y = fy + 12;
  c.text(d.appName, CX, y, 12, 700, K.GREEN_DARK);
  c.text(d.serial, CX + CW, y, 12, 600, K.TEXT2, 'right', 'num');
  y += 22;

  // 画面：坚持天数是面值，下面一排部位图标
  const hasParts = d.parts.length > 0;
  const ph = hasParts ? 144 : 104;
  c.rect(CX, y, CW, ph, 8, K.HEADER);
  const num = String(d.persistDays);
  const numW = measure(num, 60, 700, 'num');
  const unitW = measure('天', 16, 700, 'body');
  const gx = CX + (CW - (numW + 6 + unitW)) / 2;
  c.text(num, gx, y + 10, 60, 700, K.GREEN_DARK, 'left', 'num');
  c.text('天', gx + numW + 6, y + 46, 16, 700, K.INK);
  c.text(d.sub, CX + CW / 2, y + 76, 12, 400, K.TEXT2, 'center');
  if (hasParts) {
    const r = 17;
    const step = Math.min(40, (CW - 2 * r - 8) / Math.max(1, d.parts.length - 1));
    const total = step * (d.parts.length - 1) + 2 * r;
    d.parts.forEach((p, i) => {
      const cx = CX + (CW - total) / 2 + r + i * step;
      c.circle(cx, y + 112, r, p.color, '#FFFFFF', 2);
      c.image(p.icon, cx - 13, y + 99, 26, 26);
    });
  }
  y += ph + 14;

  // 三项数据
  const colW = CW / 3;
  ([[d.doneSets, '完成组数'], [d.volume, '训练容量 kg'], [d.burn, '消耗 kcal']] as [number, string][]).forEach(([v, label], i) => {
    const cx = CX + colW * i + colW / 2;
    c.text(String(v), cx, y, 18, 700, K.INK, 'center', 'num');
    c.text(label, cx, y + 24, 12, 400, K.TEXT2, 'center');
  });
  c.line(CX + colW, y, CX + colW, y + 40, K.BORDER);
  c.line(CX + colW * 2, y, CX + colW * 2, y + 40, K.BORDER);
  y += 40 + 12;

  if (d.pr) {
    const f = fitText(d.pr, CW - 10 - 16 - 8 - 10, 13, 11, 600, 'body', measure);
    c.rect(CX, y, CW, 30, 10, K.WARN_BG);
    c.image(d.trophyIcon, CX + 10, y + 7, 16, 16);
    c.text(f.text, CX + 34, y + (30 - f.size) / 2, f.size, 600, K.WARN_FG);
    y += 30 + 12;
  }

  // 印刷框底部留一条空白给邮戳：邮戳圆心在邮票右下角，顶边正好落在这条空白里
  const frameBottom = y - 12 + MARK_ROOM;
  const stampBottom = frameBottom + PAD;
  frame.h = frameBottom - fy;
  body.h = stampBottom - sy;
  perforate(c, M, sy, SW, body.h);
  postmark(c, M + SW - 38, stampBottom - 14, d.date);

  // 邮票下面的纸边：趣味文案、本月热力与小程序码（文案在邮戳探出的部分之下）
  y = stampBottom + 24;
  if (d.fun) {
    const fun = wrapText(d.fun, SW, 12, 400, 'body', measure, 2);
    fun.forEach((ln, i) => c.text(ln, POSTER_W / 2, y + i * 17, 12, 400, K.TEXT2, 'center'));
    y += fun.length * 17 + 16;
  }
  c.text(d.monthLabel, M, y, 12, 400, K.TEXT2);
  c.text(`本月打卡 ${d.monthDone} 天`, POSTER_W - M, y, 12, 400, K.TEXT2, 'right');
  y += 18;
  y += drawMonthHeat(c, paperHeat(d.heat), M, y, POSTER_W - M * 2, 12) + 18;
  y = drawFooter(c, y, POSTER_W, d.qr, d.appName, ['长按识别小程序码', '和我一起练，一起打卡'], '', PAPER_LINE);
  paper.h = y;
  return c.done(POSTER_W, y);
}
