import { mdText, toKey, type DayKey } from './date';
import { computeStreak, longestPersist, totalCheckins } from './streak';
import type { DayRecord } from './types';
import { activeLogs, dayVolume, isDoneDay } from './workout';

export interface BadgeStats {
  checkins: number;
  longestPersist: number;
  prCount: number;
  volumeKg: number;
  dishCount: number;
  buddies: number;
  challengesDone: number;
  pathfinders: number;
}

export type BadgeGroup = 'persist' | 'strength' | 'social';

export interface BadgeDef {
  id: string;
  group: BadgeGroup;
  name: string;
  desc: string;
  icon: string;
  color: string;
  metric: keyof BadgeStats;
  target: number;
  unit: string;
}

function b(id: string, group: BadgeGroup, name: string, desc: string, icon: string, color: string, metric: keyof BadgeStats, target: number, unit: string): BadgeDef {
  return { id, group, name, desc, icon, color, metric, target, unit };
}

export const BADGES: BadgeDef[] = [
  b('first', 'persist', '第一次', '完成第一次训练', 'check', '#2E7D4F', 'checkins', 1, '次'),
  b('persist-7', 'persist', '一周不掉线', '已坚持 7 天', 'tab-cal', '#2E7D4F', 'longestPersist', 7, '天'),
  b('persist-21', 'persist', '21 天习惯', '已坚持 21 天', 'tab-cal', '#2A9D8F', 'longestPersist', 21, '天'),
  b('persist-50', 'persist', '半百坚持', '已坚持 50 天', 'tab-cal', '#3B6FB6', 'longestPersist', 50, '天'),
  b('persist-100', 'persist', '百日筑基', '已坚持 100 天', 'tab-cal', '#8A63C7', 'longestPersist', 100, '天'),
  b('count-10', 'persist', '十次打卡', '累计打卡 10 次', 'poster', '#2E7D4F', 'checkins', 10, '次'),
  b('count-50', 'persist', '五十次打卡', '累计打卡 50 次', 'poster', '#3B6FB6', 'checkins', 50, '次'),
  b('count-100', 'persist', '百次打卡', '累计打卡 100 次', 'poster', '#8A63C7', 'checkins', 100, '次'),
  b('pr-1', 'strength', '破纪录', '第一次刷新个人纪录', 'trophy', '#E07B39', 'prCount', 1, '次'),
  b('pr-10', 'strength', '纪录收割机', '刷新个人纪录 10 次', 'trophy', '#B5523B', 'prCount', 10, '次'),
  b('vol-1t', 'strength', '一头小象', '累计举起 1 吨', 'part-leg', '#3B6FB6', 'volumeKg', 1000, 'kg'),
  b('vol-10t', 'strength', '一辆公交车', '累计举起 10 吨', 'part-back', '#B5523B', 'volumeKg', 10000, 'kg'),
  b('vol-150t', 'strength', '一头蓝鲸', '累计举起 150 吨', 'part-chest', '#5B7FB8', 'volumeKg', 150000, 'kg'),
  b('dish-6', 'social', '吃货图鉴', '收录 6 道练后餐', 'tab-food', '#C99A1E', 'dishCount', 6, '道'),
  b('buddy-1', 'social', '有了搭子', '和好友成为搭子', 'tab-me', '#D1497A', 'buddies', 1, '位'),
  b('challenge-1', 'social', '挑战完成', '完成一次打卡挑战', 'trophy', '#2A9D8F', 'challengesDone', 1, '次'),
  b('path-1', 'social', '引路人', '带来 1 位好友完成首次训练', 'share', '#2E7D4F', 'pathfinders', 1, '位'),
  b('path-3', 'social', '引路人 · 银', '带来 3 位好友完成首次训练', 'share', '#66756B', 'pathfinders', 3, '位'),
  b('path-10', 'social', '引路人 · 金', '带来 10 位好友完成首次训练', 'share', '#C99A1E', 'pathfinders', 10, '位'),
];

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((x) => x.id === id);
}

/** 终身重量纪录次数：按日期顺序维护每个动作的历史最大重量，第一次做不算 */
export function lifetimePRCount(daysAsc: DayRecord[]): number {
  const best = new Map<string, number>();
  let n = 0;
  for (const d of daysAsc) {
    if (!isDoneDay(d)) continue;
    for (const log of activeLogs(d)) {
      const ws = log.sets.filter((s) => s.done).map((s) => s.w ?? 0);
      if (!ws.length) continue;
      const mx = Math.max(...ws);
      const prev = best.get(log.exId);
      if (prev !== undefined && mx > prev && mx > 0) n++;
      if (prev === undefined || mx > prev) best.set(log.exId, mx);
    }
  }
  return n;
}

export function badgeStats(i: {
  all: DayRecord[];
  doneKeys: DayKey[];
  today: DayKey;
  dishCount: number;
  social: { buddies: number; challengesDone: number; pathfinders: number };
}): BadgeStats {
  const asc = i.all.slice().sort((a, b2) => (a.date < b2.date ? -1 : 1));
  return {
    checkins: totalCheckins(i.doneKeys, i.today),
    longestPersist: Math.max(longestPersist(i.doneKeys, '2000-01-01', i.today), computeStreak(i.doneKeys, i.today).persistDays),
    prCount: lifetimePRCount(asc),
    volumeKg: Math.round(asc.filter((d) => isDoneDay(d)).reduce((v, d) => v + dayVolume(d), 0)),
    dishCount: i.dishCount,
    buddies: i.social.buddies,
    challengesDone: i.social.challengesDone,
    pathfinders: i.social.pathfinders,
  };
}

export function newlyEarned(stats: BadgeStats, owned: Record<string, number>): BadgeDef[] {
  return BADGES.filter((x) => !(x.id in owned) && stats[x.metric] >= x.target);
}

const GROUP_TITLE: Record<BadgeGroup, string> = { persist: '坚持', strength: '力量', social: '社交与收集' };

function progressText(def: BadgeDef, cur: number): string {
  if (def.metric === 'volumeKg') return `${(Math.min(cur, def.target) / 1000).toFixed(1)} / ${def.target / 1000} 吨`;
  return `${Math.min(cur, def.target)} / ${def.target} ${def.unit}`;
}

/** 「我的」页徽章入口卡：最近得到的 3 枚（新的在前）+ 最接近的下一枚 */
export function badgeEntryVM(stats: BadgeStats, owned: Record<string, number>) {
  const got = BADGES.filter((x) => x.id in owned);
  const recent = got
    .slice()
    .sort((a, b) => owned[b.id] - owned[a.id])
    .slice(0, 3)
    .map((d) => ({ key: d.id, icon: d.icon, color: d.color, name: d.name }));
  let next: { name: string; icon: string; color: string; pct: number; progressText: string } | null = null;
  for (const def of BADGES) {
    // 已拥有的、以及条件已满足只等下次完成训练时发放的，都不算「下一枚」
    if (def.id in owned || stats[def.metric] >= def.target) continue;
    const pct = Math.min(99, Math.round((stats[def.metric] / def.target) * 100));
    if (!next || pct > next.pct) next = { name: def.name, icon: def.icon, color: def.color, pct, progressText: progressText(def, stats[def.metric]) };
  }
  return { recent, next, earnedText: `${got.length}/${BADGES.length}` };
}

export function badgeWallVM(stats: BadgeStats, owned: Record<string, number>) {
  const groups = (['persist', 'strength', 'social'] as BadgeGroup[]).map((g) => ({
    key: g,
    title: GROUP_TITLE[g],
    items: BADGES.filter((x) => x.group === g).map((def) => {
      const at = owned[def.id];
      const cur = stats[def.metric];
      return {
        key: def.id, id: def.id, name: def.name, desc: def.desc, icon: def.icon, color: def.color,
        earned: !!at,
        pct: at ? 100 : Math.min(100, Math.round((cur / def.target) * 100)),
        progressText: at ? '已获得' : progressText(def, cur),
        dateText: at ? `${mdText(toKey(new Date(at)))}获得` : '',
      };
    }),
  }));
  return { earned: BADGES.filter((x) => x.id in owned).length, total: BADGES.length, groups };
}
