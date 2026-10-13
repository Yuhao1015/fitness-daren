import { ASSET_BASE } from '../config';

export function spriteSrc(sprite: string): string {
  return ASSET_BASE ? `${ASSET_BASE}/dish/${sprite}.png` : `/assets/dish/${sprite}.png`;
}
