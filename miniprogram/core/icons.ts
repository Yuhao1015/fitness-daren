import { EXERCISES } from './catalog';
import { FOOD_ICONS } from './icons-food';
import { CROPS, muscleBody } from './muscle';
import { exerciseFigure } from './muscle-map';
import { svgUri } from './svg';

export interface IconDef {
  vb: 24 | 32;
  sw: number;
  body: string;
}

const FILL = 'fill="currentColor" stroke="none"';

export const ICONS: Record<string, IconDef> = {
  info: { vb: 24, sw: 2, body: `<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1.2" ${FILL}/>` },
  'chevron-down': { vb: 24, sw: 2.4, body: '<path d="M6 9l6 6 6-6"/>' },
  'chevron-left': { vb: 24, sw: 2, body: '<path d="M15 6l-6 6 6 6"/>' },
  'chevron-right': { vb: 24, sw: 2, body: '<path d="M9 6l6 6-6 6"/>' },
  minus: { vb: 24, sw: 2.4, body: '<path d="M6 12h12"/>' },
  plus: { vb: 24, sw: 2.4, body: '<path d="M6 12h12M12 6v12"/>' },
  check: { vb: 24, sw: 2.6, body: '<path d="M5 12.5l4.5 4.5L19 7.5"/>' },
  close: { vb: 24, sw: 2.2, body: '<path d="M7 7l10 10M17 7L7 17"/>' },
  undo: { vb: 24, sw: 2, body: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2"/>' },
  /** ↻ 照上次 */
  repeat: { vb: 24, sw: 2.2, body: '<path d="M19.5 12.5a7.5 7.5 0 1 1-2.2-5.8"/><path d="M19 3.5v4.5h-4.5"/>' },
  /** ⏭ 跳过休息 */
  skip: { vb: 24, sw: 2.2, body: `<path d="M6 6.5l8.5 5.5L6 17.5Z" ${FILL}/><path d="M18 6v12"/>` },
  share: { vb: 24, sw: 2, body: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>' },
  poster: { vb: 24, sw: 2, body: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
  report: { vb: 24, sw: 2, body: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 15v2M12 11v6M15 13v4"/>' },
  trophy: { vb: 24, sw: 2, body: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>' },
  play: { vb: 24, sw: 2, body: `<path d="M8 5.5v13l10.5-6.5Z" ${FILL}/>` },
  heart: { vb: 24, sw: 2, body: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>' },
  'heart-fill': { vb: 24, sw: 2, body: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="currentColor"/>' },
  'tab-today': { vb: 24, sw: 1.8, body: '<path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11"/>' },
  'tab-cal': { vb: 24, sw: 1.8, body: '<rect x="3" y="5" width="18" height="16" rx="4"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
  /** 日历 + 对勾：连续达标周 */
  'cal-check': { vb: 24, sw: 1.8, body: '<rect x="3" y="5" width="18" height="16" rx="4"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 15.2l2.4 2.4 4.6-4.6" stroke-width="2.2"/>' },
  'tab-food': { vb: 24, sw: 1.8, body: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/>' },
  'tab-rec': { vb: 24, sw: 1.8, body: '<rect x="8" y="4" width="12" height="16" rx="3"/><path d="M4.5 7.5v10a2.5 2.5 0 0 0 2.5 2.5"/>' },
  'tab-me': { vb: 24, sw: 1.8, body: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>' },
  // 部位图标是肌肉解剖图：淡淡的人形剪影，只高亮这个部位练到的肌肉（见 muscle.ts）
  'part-leg': { vb: 32, sw: 2, body: muscleBody('front', ['quad', 'calf'], CROPS.legs) },
  'part-chest': { vb: 32, sw: 2, body: muscleBody('front', ['pec'], CROPS.torso) },
  'part-arm': { vb: 32, sw: 2, body: muscleBody('front', ['biceps', 'forearm'], CROPS.arms) },
  'part-shoulder': { vb: 32, sw: 2, body: muscleBody('front', ['delt'], CROPS.torso) },
  'part-back': { vb: 32, sw: 2, body: muscleBody('back', ['trap', 'lat', 'lowback'], CROPS.torso) },
  'part-core': { vb: 32, sw: 2, body: muscleBody('front', ['abs', 'oblique'], CROPS.core) },
  'part-cardio': { vb: 32, sw: 2.2, body: '<path d="M16 26s-10-6-10-13a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 13-10 13Z"/><path d="M9 16h4l2-3 2 6 2-3h4"/>' },
  /** 硬拉练的是整条后链：下背、臀、腿后侧 */
  'lift-deadlift': { vb: 32, sw: 2, body: muscleBody('back', ['lowback', 'glute', 'ham'], CROPS.posterior) },
  ...FOOD_ICONS,
  // 每个动作一个小人形，只高亮主要肌群（专注模式用，见 muscle-map.ts）
  ...Object.fromEntries(
    EXERCISES.map((e) => {
      const f = exerciseFigure(e.id);
      return ['ex-' + e.id, { vb: 32, sw: 2, body: muscleBody(f.view, f.highlight, f.crop) } as IconDef];
    }),
  ),
};

const LIFT_ICON: Record<string, string> = {
  'bench-press': 'part-chest',
  squat: 'part-leg',
  deadlift: 'lift-deadlift',
  'db-shoulder-press': 'part-shoulder',
};

export function liftIcon(exId: string): string {
  return LIFT_ICON[exId] ?? 'part-chest';
}

export function iconSvg(name: string, color: string): string {
  const d = ICONS[name];
  if (!d) throw new Error('unknown icon ' + name);
  const body = d.body.replace(/currentColor/g, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.vb} ${d.vb}" fill="none" stroke="${color}" stroke-width="${d.sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const cache = new Map<string, string>();

export function iconUri(name: string, color: string): string {
  const k = name + '|' + color;
  let v = cache.get(k);
  if (!v) {
    v = svgUri(iconSvg(name, color));
    cache.set(k, v);
  }
  return v;
}
