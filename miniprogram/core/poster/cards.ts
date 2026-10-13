import { fitText } from './text';
import { COLORS as K, Canvas2DPlan, type Measure, type PosterSpec } from './types';

export const CARD_W = 500;
export const CARD_H = 400;

export interface DishCardData {
  appName: string;
  name: string;
  kcal: number;
  p: number;
  tint: string;
  /** composeDish 的图层图片，按叠放顺序 */
  layers: string[];
}

export function buildDishCard(d: DishCardData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  c.rect(0, 0, CARD_W, CARD_H, 0, d.tint);
  c.circle(CARD_W / 2, 70, 150, 'rgba(255,255,255,0.45)');
  d.layers.forEach((src) => c.image(src, 82, 40, 336, 210));
  c.rect(0, 270, CARD_W, 130, 0, '#FFFFFF');
  const name = fitText(d.name, CARD_W - 56, 26, 18, 700, 'body', measure);
  c.text(name.text, 28, 290, name.size, 700, K.INK);
  c.text(`${d.kcal} kcal · 蛋白质 ${d.p}g`, 28, 330, 18, 500, K.TEXT2);
  c.text(d.appName + ' · 练后餐', CARD_W - 28, 364, 14, 600, K.GREEN_DARK, 'right');
  return c.done(CARD_W, CARD_H);
}

export interface PlanCardData {
  appName: string;
  name: string;
  days: { label: string; rest: boolean }[];
}

export function buildPlanCard(d: PlanCardData, measure: Measure): PosterSpec {
  const c = new Canvas2DPlan();
  c.rect(0, 0, CARD_W, CARD_H, 0, K.HEADER);
  c.rect(24, 120, CARD_W - 48, 230, 24, '#FFFFFF');
  const title = fitText(`我在用「${d.name}」`, CARD_W - 56, 30, 20, 700, 'body', measure);
  c.text(title.text, 28, 44, title.size, 700, K.INK);
  let x = 48;
  let y = 148;
  d.days.forEach((day) => {
    const w = measure(day.label, 18, 600, 'body') + 32;
    if (x + w > CARD_W - 48) {
      x = 48;
      y += 52;
    }
    c.rect(x, y, w, 40, 20, day.rest ? '#F1F4F1' : K.TINT);
    c.text(day.label, x + w / 2, y + 11, 18, 600, day.rest ? K.TEXT2 : K.GREEN_DARK, 'center');
    x += w + 12;
  });
  c.text('一键套用到你的日历', 48, 304, 18, 600, K.GREEN);
  c.text(d.appName, CARD_W - 28, 364, 14, 600, K.GREEN_DARK, 'right');
  return c.done(CARD_W, CARD_H);
}
