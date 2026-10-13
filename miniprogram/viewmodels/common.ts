import { PARTS, type PartId } from '../core/catalog';
import type { DayKey } from '../core/date';
import type { DayLookup } from '../core/types';
import { daysSincePart } from '../core/workout';

export const C = {
  GREEN: '#2E7D4F',
  GREEN_DARK: '#1F5C38',
  TINT: '#EAF5EA',
  TINT2: '#F5FAF4',
  BORDER: '#E0EBDE',
  INK: '#1E2A22',
  TEXT2: '#4E5E53',
  TEXT3: '#66756B',
  MUTED: '#B4BEB6',
  TRACK: '#EEF2EE',
  CHIP_OFF: '#F1F4F1',
  WARN_BG: '#FDF1E7',
  WARN_FG: '#8A4513',
  HOT: '#9A3B12',
};

export interface Colors {
  bg: string;
  fg: string;
  bd: string;
}

export function chipColors(on: boolean): Colors {
  return on ? { bg: C.TINT, fg: C.GREEN_DARK, bd: C.GREEN } : { bg: '#FFFFFF', fg: C.INK, bd: C.BORDER };
}

export interface ChipVM extends Colors {
  key: string;
  id: string;
  label: string;
  color: string;
  icon: string;
  on: boolean;
}

export function chip(id: string, label: string, on: boolean, color = '', icon = ''): ChipVM {
  return { key: id, id, label, color, icon, on, ...chipColors(on) };
}

export interface PartChipVM extends ChipVM {
  /** 右上角小数字：距上次练这个部位几天（7 天以上为 7+，没练过为空） */
  badge: string;
  /** 48 小时内刚练过（力量部位）：图标变淡，提示还在恢复 */
  dim: boolean;
}

/** 每个部位距上次完成训练的天数（30 天内没练过为 null） */
export function partRest(lookup: DayLookup, from: DayKey): Record<PartId, number | null> {
  return Object.fromEntries(PARTS.map((p) => [p.id, daysSincePart(lookup, p.id, from, { doneOnly: true })])) as Record<PartId, number | null>;
}

export function partChips(selected: PartId[], rest?: Record<PartId, number | null>): PartChipVM[] {
  return PARTS.map((p) => {
    const n = rest ? rest[p.id] : null;
    const on = selected.includes(p.id);
    return {
      ...chip(p.id, p.name, on, p.color, 'part-' + p.id),
      badge: n === null ? '' : n >= 7 ? '7+' : String(n),
      // 已经选中的部位不变淡：选中态要清楚
      dim: n !== null && n <= 1 && p.id !== 'cardio' && !on,
      label: p.name + (n === null ? '' : `，${n >= 7 ? '7 天以上' : n + ' 天'}没练`),
    };
  });
}

export interface InfoVM {
  open: boolean;
  text: string;
  fg: string;
}

export function info(openKey: string | null, key: string, text: string): InfoVM {
  const open = openKey === key;
  return { open, text, fg: open ? C.GREEN_DARK : C.TEXT3 };
}

export const INFO_TEXT = {
  suggest: '根据各部位距离上次训练的天数，推荐休息最久的部位。下面的部位可以多选。',
  sets: '每组填好重量和次数后点右侧的勾，打勾的组才计入消耗和训练容量。点动作或部位名称可以收起、展开；点三角按钮进入专注模式。',
  cardio: '填写手表或器械上显示的消耗，会计入今日消耗。没有读数时，填时长后可以按参考值估算（按你填写的体重，未填按 70 kg）。',
  tplSuffix: '。点分享可以把计划发给好友，对方一键套用。',
  grams: '不方便称重时：一掌心大小、一指厚的肉约 100 g；一拳米饭约 150 g；一捧蔬菜约 100 g。',
  swipe: '右划卡片换下一道，点「撤回」回到上一道。顺序按今天练的部位和你的体重排列。',
  prog: '每个点是那次训练中这个动作的最大重量，点圆点可以查看当次的重量和次数。',
};
