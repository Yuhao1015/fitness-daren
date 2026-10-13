import { SPRITES } from './dish-sprites';
import type { Family, Recipe, SlotName } from './recipes';

type Step = SlotName | 'back' | 'front';

const SEQ: Record<Family, Step[]> = {
  bowl: ['back', 'base', 'side-left', 'protein', 'side', 'topping', 'front', 'rim'],
  plate: ['back', 'base', 'side', 'carb', 'protein', 'garnish'],
  cup: ['back', 'layer-bottom', 'layer-mid', 'layer-top', 'topping', 'front'],
  box: ['back', 'left', 'top-right', 'bottom-right', 'front'],
};

export interface DishLayer {
  key: string;
  sprite: string;
}

export const STEAM = ['common.steam-1', 'common.steam-2', 'common.steam-3'];

export function composeDish(r: Recipe, available: string[] = SPRITES): DishLayer[] {
  const has = new Set(available);
  const out: string[] = [];
  for (const step of SEQ[r.family]) {
    if (step === 'back' || step === 'front') {
      const name = `${r.family}.${step}`;
      if (has.has(name)) out.push(name);
      continue;
    }
    const v = r.slots[step];
    if (!v) continue;
    const name = `${r.family}.${step}.${v}`;
    const fallback = `${r.family}.${step}._generic`;
    if (has.has(name)) out.push(name);
    else if (has.has(fallback)) out.push(fallback);
  }
  return out.map((sprite, i) => ({ key: `${i}-${sprite}`, sprite }));
}
