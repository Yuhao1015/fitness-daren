/**
 * 肌肉解剖图标：同一个人形（正面 / 背面），按部位只高亮对应的肌群，其余部分是淡淡的剪影。
 * 人形画在 64 × 128 的母版坐标里，肌群各自独立，所以以后可以细到「二头 / 三头」。
 * 双色靠透明度实现：剪影是 currentColor 的 24%，高亮是 currentColor 本色，
 * 所以放在白底、浅色底、彩色底（白色图标）上都成立，调用方只需要给一个颜色。
 */
export type MuscleView = 'front' | 'back';
export type MuscleId = 'pec' | 'delt' | 'biceps' | 'triceps' | 'forearm' | 'abs' | 'oblique' | 'quad' | 'calf' | 'trap' | 'lat' | 'lowback' | 'glute' | 'ham';

/** 母版里的取景框：取景框会被缩放并居中放进 32 × 32 的图标画布 */
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CROPS = {
  /** 肩到胯：胸、肩、背 */
  torso: { x: 3, y: 17, w: 58, h: 62 },
  /** 双臂放大：手臂 */
  arms: { x: 0, y: 20, w: 64, h: 56 },
  /** 腰到胯，双臂垂在两侧：腹 */
  core: { x: 4, y: 30, w: 56, h: 56 },
  /** 胯到脚：腿（从 y = 76 起，避开垂下的手） */
  legs: { x: 12, y: 76, w: 40, h: 50 },
  /** 背面，下背到大腿：硬拉的后链 */
  posterior: { x: 8, y: 38, w: 48, h: 64 },
} satisfies Record<string, Crop>;

const R = 'stroke-linecap="round" stroke-linejoin="round"';

/** 沿 x = 32 镜像：只画左半边，右半边由镜像得到 */
const pair = (shape: string): string => `${shape}<g transform="matrix(-1 0 0 1 64 0)">${shape}</g>`;
/** 一段圆头的粗线，用来画四肢与肌腹 */
const limb = (x1: number, y1: number, x2: number, y2: number, w: number): string => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="${w}" ${R}/>`;
const blob = (d: string): string => `<path d="${d}" fill="currentColor" stroke="none"/>`;

/** 淡淡的剪影：头、颈、躯干、双臂、双腿。整组一起套透明度，重叠处不会变深 */
const SILHOUETTE =
  '<g opacity=".27" fill="currentColor" stroke="none">' +
  '<ellipse cx="32" cy="9.5" rx="6.3" ry="7.7"/>' +
  '<path d="M28.3 15h7.4v9h-7.4z"/>' +
  '<path d="M14.5 26Q19 21.5 27 21.5H37Q45 21.5 49.5 26L47.5 41Q45.5 55 41 65L42.5 78H21.5L23 65Q18.5 55 16.5 41Z"/>' +
  pair(limb(11.4, 28, 8.6, 48, 9) + limb(8.4, 51, 6.6, 67, 7) + '<circle cx="6.3" cy="71.5" r="3.4" stroke="none"/>') +
  pair(limb(26, 80, 25.4, 103, 12) + limb(25, 107, 24.6, 123, 8.2)) +
  '</g>';

const FRONT: Partial<Record<MuscleId, string>> = {
  pec: pair(blob('M31 28.6V43.6Q24.6 46 19.6 41.2Q17 34.6 20 30Q25 27 31 28.6Z')),
  delt: pair('<ellipse cx="13.2" cy="28.8" rx="6" ry="6.6" fill="currentColor" stroke="none"/>'),
  biceps: pair(limb(10, 34, 9, 45, 6.8)),
  forearm: pair(limb(8.1, 52.5, 7, 65, 5.8)),
  abs: pair(
    [47, 53, 59].map((y) => `<rect x="27.4" y="${y}" width="4.2" height="4.6" rx="1.6" fill="currentColor" stroke="none"/>`).join(''),
  ),
  oblique: pair(blob('M23.6 47.6Q21.4 56 23.8 65.4L26.4 63.6Q24.8 56 26 49.4Z')),
  quad: pair(limb(26.6, 83, 25.8, 101, 10)),
  calf: pair(limb(25.2, 109, 24.8, 121, 6.4)),
};

const BACK: Partial<Record<MuscleId, string>> = {
  trap: blob('M32 20L25 23.4L18.4 27.2Q23.6 31 28 38.4L32 45L36 38.4Q40.4 31 45.6 27.2L39 23.4Z'),
  delt: pair('<ellipse cx="13.2" cy="28.8" rx="6" ry="6.6" fill="currentColor" stroke="none"/>'),
  triceps: pair(limb(10, 34, 9, 45, 6.8)),
  forearm: pair(limb(8.1, 52.5, 7, 65, 5.8)),
  lat: pair(blob('M18.6 33.4Q17 45 21.6 58.6L30.4 62.4L30 45.6Q23.6 43.4 18.6 33.4Z')),
  lowback: pair(blob('M31 49.6L27.2 53L27.6 68.6H31Z')),
  glute: pair('<ellipse cx="27.2" cy="75.6" rx="6" ry="6.2" fill="currentColor" stroke="none"/>'),
  ham: pair(limb(26.6, 83, 25.8, 101, 10)),
  calf: pair(limb(25.2, 109, 24.8, 121, 6.4)),
};

/** 取景框 → 把母版坐标缩放并居中到 32 × 32 画布的变换 */
export function cropTransform(c: Crop): string {
  const s = 32 / Math.max(c.w, c.h);
  const tx = (32 - c.w * s) / 2 - c.x * s;
  const ty = (32 - c.h * s) / 2 - c.y * s;
  const f = (n: number) => Number(n.toFixed(3));
  return `translate(${f(tx)} ${f(ty)}) scale(${f(s)})`;
}

/** 这块肌肉从这一面看得见吗（三头只在背面、胸只在正面……） */
export function drawable(view: MuscleView, id: MuscleId): boolean {
  return !!(view === 'front' ? FRONT : BACK)[id];
}

/** 三档强度对应的透明度：练得少 / 中等 / 够量 */
const LEVEL_OPACITY = ['0', '.4', '.7', '1'];

/**
 * 全身肌群图（「我的」页本周肌群）：完整人形，每块肌肉按 1–3 档透明度着色；
 * 0 档或这一面看不见的肌肉不画。返回完整的 svg 字符串（64 × 128）。
 */
export function bodyMapSvg(view: MuscleView, levels: Partial<Record<MuscleId, number>>, color: string): string {
  const table = view === 'front' ? FRONT : BACK;
  const lit = (Object.keys(levels) as MuscleId[])
    .filter((id) => table[id] && (levels[id] ?? 0) > 0)
    .map((id) => `<g opacity="${LEVEL_OPACITY[Math.min(3, levels[id]!)]}">${table[id]}</g>`)
    .join('');
  const body = (SILHOUETTE + lit).replace(/currentColor/g, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" fill="none">${body}</svg>`;
}

/** 一个肌肉图标的 svg 内容（给 icons.ts 的 body 用）：淡剪影 + 被高亮的肌群 */
export function muscleBody(view: MuscleView, highlight: MuscleId[], crop: Crop): string {
  const table = view === 'front' ? FRONT : BACK;
  const lit = highlight.map((id) => {
    const shape = table[id];
    if (!shape) throw new Error(`muscle ${id} is not drawn in the ${view} view`);
    return shape;
  });
  return `<g transform="${cropTransform(crop)}">${SILHOUETTE}${lit.join('')}</g>`;
}
