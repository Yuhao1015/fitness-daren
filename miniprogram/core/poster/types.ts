export type FontKind = 'num' | 'body';
export type Weight = 400 | 500 | 600 | 700;
export type Align = 'left' | 'center' | 'right';

export type Op =
  | { k: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: string | null; stroke: string | null; sw: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; dash: number[] }
  | { k: 'circle'; cx: number; cy: number; r: number; fill: string; ring: string | null; ringWidth: number }
  | { k: 'text'; x: number; y: number; text: string; size: number; weight: Weight; color: string; align: Align; font: FontKind }
  | { k: 'image'; x: number; y: number; w: number; h: number; src: string; r: number }
  /** 绕 (cx, cy) 旋转 deg 度，直到下一个 restore；成对出现，不嵌套 */
  | { k: 'rotate'; cx: number; cy: number; deg: number }
  | { k: 'restore' };

/** 逻辑像素；导出时整体 ×3。文字的 y 是文字框顶边（textBaseline = top） */
export interface PosterSpec {
  width: number;
  height: number;
  ops: Op[];
  images: string[];
}

export type Measure = (text: string, size: number, weight: Weight, font: FontKind) => number;

export const COLORS = {
  GREEN: '#2E7D4F',
  GREEN_DARK: '#1F5C38',
  HEADER: '#DDEFD9',
  TINT: '#EAF5EA',
  BORDER: '#E0EBDE',
  INK: '#1E2A22',
  TEXT2: '#4E5E53',
  TRACK: '#EEF2EE',
  WARN_BG: '#FDF1E7',
  WARN_FG: '#8A4513',
};

/** 收集指令的小工具：自动登记图片 */
export class Canvas2DPlan {
  ops: Op[] = [];
  private imgs = new Set<string>();

  rect(x: number, y: number, w: number, h: number, r: number, fill: string | null, stroke: string | null = null, sw = 0): void {
    this.ops.push({ k: 'rect', x, y, w, h, r, fill, stroke, sw });
  }
  line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1, dash: number[] = []): void {
    this.ops.push({ k: 'line', x1, y1, x2, y2, color, width, dash });
  }
  circle(cx: number, cy: number, r: number, fill: string, ring: string | null = null, ringWidth = 0): void {
    this.ops.push({ k: 'circle', cx, cy, r, fill, ring, ringWidth });
  }
  text(text: string, x: number, y: number, size: number, weight: Weight, color: string, align: Align = 'left', font: FontKind = 'body'): void {
    this.ops.push({ k: 'text', x, y, text, size, weight, color, align, font });
  }
  image(src: string, x: number, y: number, w: number, h: number, r = 0): void {
    this.ops.push({ k: 'image', x, y, w, h, src, r });
    this.imgs.add(src);
  }
  rotate(cx: number, cy: number, deg: number): void {
    this.ops.push({ k: 'rotate', cx, cy, deg });
  }
  restore(): void {
    this.ops.push({ k: 'restore' });
  }
  done(width: number, height: number): PosterSpec {
    return { width, height, ops: this.ops, images: Array.from(this.imgs) };
  }
}
