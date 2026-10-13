// 预览用的演示数据（只在浏览器预览里用，不进小程序包）。用与应用完全相同的 core 函数构造记录，
// 再经 DayRepo / ProfileStore 写入存储，所以页面看到的和真机上训练后的数据没有区别。
import { badgeStats, newlyEarned } from '../../miniprogram/core/badges';
import { addDays, todayKey } from '../../miniprogram/core/date';
import { addFood, addSet, setDone, togglePart, updateSet } from '../../miniprogram/core/day-ops';
import { emptyDay, type DayRecord, type PartId } from '../../miniprogram/core/types';
import { DayRepo, ProfileStore, WxStorage } from '../../miniprogram/services/store';

const PREFIX = 'jsd:';

export function seedFresh(): void {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
}

const PUSH: { parts: PartId[]; lifts: [string, number, number][] } = {
  parts: ['chest', 'shoulder'],
  lifts: [['bench-press', 50, 8], ['incline-db-press', 18, 10], ['db-shoulder-press', 16, 10], ['lateral-raise', 7, 15]],
};
const PULL: typeof PUSH = {
  parts: ['back', 'core'],
  lifts: [['deadlift', 80, 5], ['barbell-row', 50, 8], ['lat-pulldown', 45, 10], ['crunch', 0, 20]],
};
const LEGS: typeof PUSH = {
  parts: ['leg', 'core'],
  lifts: [['squat', 60, 8], ['leg-press', 100, 10], ['lunge', 16, 10], ['plank', 0, 60]],
};
const CYCLE = [PUSH, PULL, LEGS];
const DAYS_AGO = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29, 31, 33, 36];

export function seedDemo(todayDone = false): void {
  seedFresh();
  const storage = new WxStorage();
  const repo = new DayRepo(storage);
  const profile = new ProfileStore(storage);
  const now = Date.now();
  const today = todayKey(now);

  profile.update({ goal: 'bulk', weeklyTarget: 4, bodyweightKg: 72, nickname: '阿杰', onboardedAt: now - 40 * 86400000 });

  const oldest = Math.max(...DAYS_AGO);
  DAYS_AGO.slice().reverse().forEach((ago, i) => {
    const tpl = CYCLE[i % 3];
    const date = addDays(today, -ago);
    let d: DayRecord = emptyDay(date);
    for (const p of tpl.parts) d = togglePart(d, p);
    const progress = (oldest - ago) * 0.12;
    const at = now - ago * 86400000;
    for (const [ex, base, reps] of tpl.lifts) {
      const w = base === 0 ? null : Math.round((base + progress * (base / 30)) / 2.5) * 2.5;
      for (let s = 0; s < 4; s++) {
        d = addSet(d, ex, { w, r: reps });
        d = updateSet(d, ex, s, { done: true }, at);
      }
    }
    d = setDone(d, true, at);
    repo.put(d);
  });

  if (todayDone) {
    // 今天练了胸 + 腹，卧推 60kg 比历史最好的 57.5kg 重，海报上会出现新纪录
    let t: DayRecord = emptyDay(today);
    for (const p of ['chest', 'core'] as PartId[]) t = togglePart(t, p);
    for (const [ex, w, r] of [['bench-press', 60, 8], ['incline-db-press', 20, 10], ['crunch', null, 20]] as [string, number | null, number][]) {
      for (let s = 0; s < 4; s++) {
        t = addSet(t, ex, { w, r });
        t = updateSet(t, ex, s, { done: true }, now);
      }
    }
    repo.put(setDone(t, true, now));
  }

  // 已满足条件的徽章视为早就拿到了，徽章墙和打卡数据才对得上
  const owned: Record<string, number> = {};
  const stats = badgeStats({ all: repo.all(), doneKeys: repo.doneDayKeys(), today, dishCount: 0, social: { buddies: 0, challengesDone: 0, pathfinders: 0 } });
  const earlier = repo.all().filter((d) => d.date < today && d.done).map((d) => d.date).sort();
  newlyEarned(stats, {}).forEach((b, i) => (owned[b.id] = new Date(earlier[Math.min(earlier.length - 1, i * 2)] + 'T12:00:00').getTime()));
  storage.set('badges', owned);

  // 昨天吃过两样，今天先空着，方便现场体验记录
  const yesterday = addDays(today, -1);
  let y = repo.getOrEmpty(yesterday);
  y = addFood(y, { id: 'f-seed-1', at: now - 86400000, title: '牛肉糙米碗', kcal: 408, p: 35, c: 51, f: 8, src: 'recipe', recipeId: 'beef-brown-rice-bowl' });
  y = addFood(y, { id: 'f-seed-2', at: now - 86400000 + 3600000, title: '蛋白奶昔', kcal: 180, p: 28, c: 8, f: 3, src: 'quick' });
  repo.put(y);
}
