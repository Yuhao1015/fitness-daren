import { BALANCED_PERSONA, PARTS, PERSONA, type PartId } from './catalog';
import type { DayKey } from './date';

interface Ref {
  name: string;
  value: number;
}

export const WEIGHT_REFS: Ref[] = [
  { name: '只大熊猫', value: 100 },
  { name: '只东北虎', value: 200 },
  { name: '架三角钢琴', value: 400 },
  { name: '辆小汽车', value: 1500 },
  { name: '头非洲象', value: 6000 },
  { name: '头蓝鲸', value: 150000 },
];

export const ENERGY_REFS: Ref[] = [
  { name: '碗米饭', value: 174 },
  { name: '根香蕉', value: 89 },
  { name: '个鸡蛋', value: 72 },
];

export function seedOf(k: DayKey): number {
  return Number(k.replace(/-/g, ''));
}

function pick(value: number, refs: Ref[], seed: number): string {
  const sorted = refs.slice().sort((a, b) => a.value - b.value);
  const candidates = sorted.filter((r) => value / r.value >= 1 && value / r.value <= 20);
  let ref: Ref;
  if (candidates.length) ref = candidates[Math.abs(seed) % candidates.length];
  else ref = value / sorted[0].value < 1 ? sorted[0] : sorted[sorted.length - 1];
  return `≈ ${(value / ref.value).toFixed(1)} ${ref.name}`;
}

export function weightFun(kg: number, seed: number): string {
  return pick(kg, WEIGHT_REFS, seed);
}

export function energyFun(kcal: number, seed: number): string {
  // 热量只用米饭作主参照，保持原型语气；其余参照留给徽章文案
  return pick(kcal, ENERGY_REFS.slice(0, 1), seed);
}

/** 打卡海报上的一句话（原型 1609–1611 行） */
export function posterFun(volumeKg: number, burnKcal: number, seed: number): string {
  if (volumeKg >= 100) return '今天举起的总重量 ' + weightFun(volumeKg, seed);
  if (burnKcal > 0) return '今天燃烧的热量 ' + energyFun(burnKcal, seed);
  return '';
}

export function topPart(counts: Record<PartId, number>): PartId | null {
  let best: PartId | null = null;
  for (const p of PARTS) if (counts[p.id] > 0 && (best === null || counts[p.id] > counts[best])) best = p.id;
  return best;
}

/** 最常练部位占比 ≥ 30% 时给人设，否则「均衡发展型」 */
export function persona(counts: Record<PartId, number>): string {
  const total = PARTS.reduce((n, p) => n + counts[p.id], 0);
  const top = topPart(counts);
  if (!total || !top) return BALANCED_PERSONA;
  return counts[top] / total >= 0.3 ? PERSONA[top] : BALANCED_PERSONA;
}
