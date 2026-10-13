import { fitText, wrapText } from './text';
import { COLORS as K, Canvas2DPlan, type Measure, type PosterSpec } from './types';

export const POSTER_W = 310;
const P = 20;
const IW = POSTER_W - P * 2;

export interface HeatCell {
  bg: string;
  ring: string;
}

export interface CheckinPosterData {
  appName: string;
  date: string;
  persistDays: number;
  sub: string;
  parts: { color: string; icon: string }[];
  doneSets: number;
  volume: number;
  burn: number;
  pr: string;
  fun: string;
  monthLabel: string;
  monthDone: number;
  heat: HeatCell[];
  serial: string;
  qr: string | null;
  trophyIcon: string;
}

/** 本月热力格子：7 列，返回占用高度 */
export function drawMonthHeat(c: Canvas2DPlan, heat: HeatCell[], x: number, y: number, w: number, cellH: number): number {
  const gap = 4;
  const cw = (w - gap * 6) / 7;
  heat.forEach((h, i) => {
    const cx = x + (i % 7) * (cw + gap);
    const cy = y + Math.floor(i / 7) * (cellH + gap);
    if (h.bg !== 'transparent') c.rect(cx, cy, cw, cellH, 4, h.bg);
    if (h.ring !== 'transparent') c.rect(cx + 0.75, cy + 0.75, cw - 1.5, cellH - 1.5, 4, null, h.ring, 1.5);
  });
  const rows = Math.ceil(heat.length / 7);
  return rows * (cellH + gap) - gap;
}

/** 底部：虚线 + 小程序码（无码时改为「微信搜索」） */
export function drawFooter(c: Canvas2DPlan, y: number, width: number, qr: string | null, appName: string, lines: [string, string], right: string, lineColor: string = K.BORDER): number {
  c.line(0, y, width, y, lineColor, 1, [4, 3]);
  const top = y + 12;
  if (qr) {
    c.image(qr, P, top, 56, 56, 28);
    c.text(lines[0], P + 68, top + 10, 14, 700, K.INK);
    c.text(lines[1], P + 68, top + 32, 12, 400, K.TEXT2);
  } else {
    c.text(`微信搜索「${appName}」`, P, top + 10, 14, 700, K.INK);
    c.text(lines[1], P, top + 32, 12, 400, K.TEXT2);
  }
  if (right) c.text(right, width - P, top + 10, 12, 600, K.GREEN_DARK, 'right', 'num');
  return top + 56 + 16;
}

export function buildCheckinPoster(d: CheckinPosterData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  // 白底与顶部浅绿区先入列，高度在排版结束后回填
  const bg = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: '#FFFFFF', stroke: null, sw: 0 };
  const band = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: K.HEADER, stroke: null, sw: 0 };
  c.ops.push(bg, band);
  let y = 16;
  c.text(d.appName, P, y, 14, 700, K.GREEN_DARK);
  c.text(d.date, POSTER_W - P, y + 1, 12, 400, K.TEXT2, 'right');
  y += 22;
  const num = String(d.persistDays);
  const numW = measure(num, 64, 700, 'num');
  c.text(num, P, y, 64, 700, K.GREEN_DARK, 'left', 'num');
  c.text('天坚持打卡', P + numW + 8, y + 22, 16, 700, K.INK);
  c.text(d.sub, P + numW + 8, y + 43, 12, 400, K.TEXT2);
  y += 64 + 12;
  if (d.parts.length) {
    const step = Math.min(58, (IW - 48) / Math.max(1, d.parts.length - 1));
    d.parts.forEach((p, i) => {
      const cx = P + 24 + i * step;
      c.circle(cx, y + 24, 24, p.color, '#FFFFFF', 3);
      c.image(p.icon, cx - 16, y + 8, 32, 32);
    });
    y += 48;
  }
  y += 20;
  band.h = y;

  // 三项数据
  y += 16;
  const colW = IW / 3;
  ([[d.doneSets, '完成组数'], [d.volume, '训练容量 kg'], [d.burn, '消耗 kcal']] as [number, string][]).forEach(([v, label], i) => {
    const cx = P + colW * i + colW / 2;
    c.text(String(v), cx, y, 20, 700, K.INK, 'center', 'num');
    c.text(label, cx, y + 26, 12, 400, K.TEXT2, 'center');
  });
  c.line(P + colW, y, P + colW, y + 42, K.BORDER);
  c.line(P + colW * 2, y, P + colW * 2, y + 42, K.BORDER);
  y += 42 + 12;

  if (d.pr) {
    const avail = IW - 12 - 16 - 8 - 12;
    const f = fitText(d.pr, avail, 14, 11, 600, 'body', measure);
    c.rect(P, y, IW, 36, 12, K.WARN_BG);
    c.image(d.trophyIcon, P + 12, y + 10, 16, 16);
    c.text(f.text, P + 36, y + (36 - f.size) / 2, f.size, 600, K.WARN_FG);
    y += 36 + 12;
  }
  if (d.fun) {
    const lines = wrapText(d.fun, IW, 14, 400, 'body', measure, 2);
    lines.forEach((ln, i) => c.text(ln, P, y + i * 20, 14, 400, K.INK));
    y += lines.length * 20 + 12;
  }

  c.text(d.monthLabel, P, y, 12, 400, K.TEXT2);
  c.text(`本月打卡 ${d.monthDone} 天`, POSTER_W - P, y, 12, 400, K.TEXT2, 'right');
  y += 18;
  y += drawMonthHeat(c, d.heat, P, y, IW, 14) + 16;

  y = drawFooter(c, y, POSTER_W, d.qr, d.appName, ['长按识别小程序码', '和我一起练，一起打卡'], d.serial);
  bg.h = y;
  return c.done(POSTER_W, y);
}
