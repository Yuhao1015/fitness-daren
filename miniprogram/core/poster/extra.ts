import { POSTER_W, drawFooter } from './checkin';
import { CARD_H, CARD_W } from './cards';
import { fitText, wrapText } from './text';
import { COLORS as K, Canvas2DPlan, type Measure, type PosterSpec } from './types';

export interface BadgeCardData { appName: string; name: string; desc: string; color: string; icon: string; dateText: string }

export function buildBadgeCard(d: BadgeCardData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  c.rect(0, 0, CARD_W, CARD_H, 0, K.HEADER);
  c.circle(CARD_W / 2, 140, 84, d.color, '#FFFFFF', 8);
  c.image(d.icon, CARD_W / 2 - 40, 100, 80, 80);
  const name = fitText(d.name, CARD_W - 60, 32, 22, 700, 'body', measure);
  c.text(name.text, CARD_W / 2, 248, name.size, 700, K.INK, 'center');
  const desc = fitText(d.desc, CARD_W - 60, 18, 14, 400, 'body', measure);
  c.text(desc.text, CARD_W / 2, 292, desc.size, 400, K.TEXT2, 'center');
  c.text(d.dateText, 28, 360, 14, 400, K.TEXT2);
  c.text('我也来挑战 →', CARD_W - 28, 358, 16, 700, K.GREEN_DARK, 'right');
  return c.done(CARD_W, CARD_H);
}

export interface PersonaCardData { appName: string; name: string; desc: string; color: string; predicted: boolean }

export function buildPersonaCard(d: PersonaCardData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  c.rect(0, 0, CARD_W, CARD_H, 0, '#FFFFFF');
  c.rect(0, 0, CARD_W, 150, 0, d.color);
  c.text(d.predicted ? '我的健身人格（预测）' : '我的健身人格', 28, 36, 18, 600, '#FFFFFF');
  const name = fitText(d.name, CARD_W - 56, 30, 20, 700, 'body', measure);
  c.text(name.text, 28, 80, name.size, 700, '#FFFFFF');
  wrapText(d.desc, CARD_W - 56, 20, 400, 'body', measure, 3).forEach((ln, i) => c.text(ln, 28, 182 + i * 32, 20, 400, K.INK));
  c.text(d.appName, 28, 358, 14, 600, K.GREEN_DARK);
  c.text('测测你是哪种健身人格 →', CARD_W - 28, 356, 16, 700, K.GREEN_DARK, 'right');
  return c.done(CARD_W, CARD_H);
}

export interface SettleData {
  appName: string;
  title: string;
  period: string;
  rankText: string;
  stamp: string;
  complete: boolean;
  members: { name: string; avatar: string | null }[];
  qr: string | null;
}

export function buildSettlePoster(d: SettleData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  const bg = { k: 'rect' as const, x: 0, y: 0, w: POSTER_W, h: 0, r: 0, fill: '#FFFFFF', stroke: null, sw: 0 };
  c.ops.push(bg);
  c.rect(0, 0, POSTER_W, 196, 0, K.HEADER);
  c.text(d.appName, 20, 16, 14, 700, K.GREEN_DARK);
  c.text(d.period, POSTER_W - 20, 17, 12, 400, K.TEXT2, 'right');
  const title = fitText(d.title, POSTER_W - 40, 22, 16, 700, 'body', measure);
  c.text(title.text, 20, 44, title.size, 700, K.INK);
  c.circle(POSTER_W / 2, 128, 46, d.complete ? K.GREEN : '#FFFFFF', d.complete ? '#FFFFFF' : K.GREEN, 3);
  const stamp = fitText(d.stamp, 84, 14, 10, 700, 'body', measure);
  c.text(stamp.text, POSTER_W / 2, 128 - stamp.size / 2, stamp.size, 700, d.complete ? '#FFFFFF' : K.GREEN_DARK, 'center');
  let y = 212;
  c.text(d.rankText, POSTER_W / 2, y, 20, 700, K.INK, 'center');
  y += 40;
  const shown = d.members.slice(0, 12);
  shown.forEach((m, i) => {
    const cx = 20 + 22 + (i % 6) * 45;
    const cy = y + 22 + Math.floor(i / 6) * 52;
    if (m.avatar) c.image(m.avatar, cx - 18, cy - 18, 36, 36, 18);
    else {
      c.circle(cx, cy, 18, K.TINT);
      c.text(Array.from(m.name)[0] || '·', cx, cy - 8, 16, 700, K.GREEN_DARK, 'center');
    }
  });
  if (d.members.length > shown.length) c.text(`+${d.members.length - shown.length}`, POSTER_W - 20, y + 22 + 52 + 10, 14, 700, K.TEXT2, 'right');
  y += Math.ceil(shown.length / 6) * 52 + 16;
  y = drawFooter(c, y, POSTER_W, d.qr, d.appName, ['长按识别，一起参加下一期', '坚持的人都在这里'], '');
  bg.h = y;
  return c.done(POSTER_W, y);
}

export interface DuoSide { name: string; avatar: string | null; line: string }

export function buildDuoPoster(d: { appName: string; date: string; a: DuoSide; b: DuoSide }, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  c.rect(0, 0, POSTER_W, 300, 0, K.HEADER);
  c.text(d.appName, 20, 16, 14, 700, K.GREEN_DARK);
  c.text(d.date, POSTER_W - 20, 17, 12, 400, K.TEXT2, 'right');
  c.text('今天我们都练了', POSTER_W / 2, 52, 24, 700, K.INK, 'center');
  [d.a, d.b].forEach((s, i) => {
    const cx = i === 0 ? 90 : POSTER_W - 90;
    if (s.avatar) c.image(s.avatar, cx - 36, 104, 72, 72, 36);
    else {
      c.circle(cx, 140, 36, '#FFFFFF');
      c.text(Array.from(s.name)[0] || '·', cx, 126, 28, 700, K.GREEN_DARK, 'center');
    }
    const name = fitText(s.name, 120, 16, 12, 700, 'body', measure);
    c.text(name.text, cx, 190, name.size, 700, K.INK, 'center');
    const line = fitText(s.line, 130, 12, 10, 400, 'body', measure);
    c.text(line.text, cx, 214, line.size, 400, K.TEXT2, 'center');
  });
  c.circle(POSTER_W / 2, 140, 16, K.GREEN);
  c.text('+', POSTER_W / 2, 129, 20, 700, '#FFFFFF', 'center');
  c.text('坚持的路上，有人一起更容易', POSTER_W / 2, 256, 14, 400, K.GREEN_DARK, 'center');
  return c.done(POSTER_W, 300);
}
