import { POSTER_W, drawFooter, drawMonthHeat, type HeatCell } from './checkin';
import { fitText, wrapText } from './text';
import { COLORS as K, Canvas2DPlan, type Measure, type PosterSpec } from './types';

const P = 20;
const IW = POSTER_W - P * 2;

export interface ReportPosterData {
  appName: string;
  monthLabel: string;
  title: string;
  days: number;
  persona: string;
  tons: string;
  burn: number;
  prs: number;
  dist: { name: string; color: string; count: number; pct: number }[];
  fun: string;
  heat: HeatCell[];
  qr: string | null;
  /** 连续达标周数；旧的月报记录没有这个字段，0 或缺省就不画 */
  weekStreak?: number;
}

export function buildReportPoster(d: ReportPosterData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  const bg = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: '#FFFFFF', stroke: null, sw: 0 };
  const band = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: K.HEADER, stroke: null, sw: 0 };
  c.ops.push(bg, band);

  let y = 16;
  c.text(d.appName, P, y, 14, 700, K.GREEN_DARK);
  c.text(d.monthLabel, POSTER_W - P, y + 1, 12, 400, K.TEXT2, 'right');
  y += 22;
  c.text(d.title, P, y, 20, 700, K.INK);
  y += 30;
  const num = String(d.days);
  const numW = measure(num, 64, 700, 'num');
  c.text(num, P, y, 64, 700, K.GREEN_DARK, 'left', 'num');
  c.text('天打卡', P + numW + 6, y + 40, 16, 700, K.INK);
  const pill = fitText(d.persona, 120, 12, 10, 700, 'body', measure);
  const pillW = measure(pill.text, pill.size, 700, 'body') + 24;
  c.rect(POSTER_W - P - pillW, y + 34, pillW, 24, 12, '#FFFFFF');
  c.text(pill.text, POSTER_W - P - pillW / 2, y + 34 + (24 - pill.size) / 2, pill.size, 700, K.GREEN_DARK, 'center');
  if (d.weekStreak && d.weekStreak > 0) c.text(`连续达标 ${d.weekStreak} 周`, POSTER_W - P, y + 63, 12, 600, K.GREEN_DARK, 'right');
  y += 64 + 18;
  band.h = y;

  y += 14;
  const colW = IW / 3;
  ([[d.tons, '训练容量 吨'], [String(d.burn), '消耗 kcal'], [String(d.prs), '新纪录（次）']] as [string, string][]).forEach(([v, label], i) => {
    const cx = P + colW * i + colW / 2;
    c.text(v, cx, y, 20, 700, K.INK, 'center', 'num');
    c.text(label, cx, y + 26, 12, 400, K.TEXT2, 'center');
  });
  c.line(P + colW, y, P + colW, y + 42, K.BORDER);
  c.line(P + colW * 2, y, P + colW * 2, y + 42, K.BORDER);
  y += 42 + 12;

  d.dist.forEach((row) => {
    c.circle(P + 4, y + 7, 4, row.color);
    c.text(row.name, P + 12, y + 1, 12, 400, K.INK);
    const bx = P + 48;
    const bw = IW - 48 - 36;
    c.rect(bx, y + 3, bw, 8, 4, K.TRACK);
    c.rect(bx, y + 3, Math.max(8, (bw * row.pct) / 100), 8, 4, row.color);
    c.text(`${row.count} 次`, POSTER_W - P, y + 1, 12, 400, K.TEXT2, 'right');
    y += 20;
  });
  y += 6;
  if (d.fun) {
    const lines = wrapText(d.fun, IW, 14, 400, 'body', measure, 2);
    lines.forEach((ln, i) => c.text(ln, P, y + i * 20, 14, 400, K.INK));
    y += lines.length * 20 + 12;
  }
  y += drawMonthHeat(c, d.heat, P, y, IW, 12) + 16;
  y = drawFooter(c, y, POSTER_W, d.qr, d.appName, ['长按识别，看看你的月报', '一起打卡，下个月比比谁更强'], '');
  bg.h = y;
  return c.done(POSTER_W, y);
}
