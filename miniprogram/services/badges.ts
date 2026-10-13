import { badgeStats, newlyEarned, type BadgeDef } from '../core/badges';
import { loadDishBook } from '../core/collection';
import type { AppContext } from './app-context';
import { loadSocialStats } from './social';
import type { StorageAdapter } from './store';

const OWNED = 'badges';
const MOTION = 'settings:motionOff';

export function loadOwned(s: StorageAdapter): Record<string, number> {
  return s.get<Record<string, number>>(OWNED) ?? {};
}

/** 计算并保存新获得的徽章；已拥有的永远不会再返回（撤销完成也不会收回） */
export function checkBadges(ctx: AppContext, now: number = Date.now()): BadgeDef[] {
  const stats = badgeStats({
    all: ctx.days.all(),
    doneKeys: ctx.days.doneDayKeys(),
    today: ctx.today(),
    dishCount: Object.keys(loadDishBook(ctx.storage)).length,
    social: loadSocialStats(ctx.storage),
  });
  const owned = loadOwned(ctx.storage);
  const fresh = newlyEarned(stats, owned);
  if (fresh.length) {
    fresh.forEach((b) => (owned[b.id] = now));
    ctx.storage.set(OWNED, owned);
  }
  return fresh;
}

/** 「我的」页徽章入口卡要的数据：当前进度 + 已拥有（与 checkBadges 同一口径） */
export function badgeInput(ctx: AppContext) {
  return {
    stats: badgeStats({
      all: ctx.days.all(),
      doneKeys: ctx.days.doneDayKeys(),
      today: ctx.today(),
      dishCount: Object.keys(loadDishBook(ctx.storage)).length,
      social: loadSocialStats(ctx.storage),
    }),
    owned: loadOwned(ctx.storage),
  };
}

export function motionOff(s: StorageAdapter): boolean {
  return s.get<boolean>(MOTION) === true;
}

export function setMotionOff(s: StorageAdapter, off: boolean): void {
  s.set(MOTION, off);
}
