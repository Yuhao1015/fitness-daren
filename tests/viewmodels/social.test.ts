import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../../miniprogram/services/store';
import { buildSocialVM } from '../../miniprogram/viewmodels/social';
import type { ChallengeView } from '../../miniprogram/services/social';

const view: ChallengeView = {
  challenge: { id: 'c1', title: '21 天打卡挑战', days: 21, rule: 'daily', rankBy: 'days', startDate: '2026-10-01', endDate: '2026-10-21', status: 'running', recruiting: false, groupId: 'G1', memberCount: 6, dayIndex: 10, required: 21, isCreator: false },
  rank: [
    { isMe: false, name: '阿杰', avatar: '', days: 9, value: 9, complete: false },
    { isMe: true, name: '我', avatar: '', days: 8, value: 8, complete: false },
  ],
  me: { rank: 2, days: 8, complete: false },
};
const sheet = { open: false, days: 7 as const, rule: 'daily' as const, rankBy: 'days' as const };

describe('buildSocialVM', () => {
  it('ports the prototype challenge card', () => {
    const vm = buildSocialVM({ challenges: [view], openId: 'c1', buddies: [], profile: DEFAULT_PROFILE, infoOpen: null, sheet });
    const c = vm.challenges[0];
    expect(c).toMatchObject({ name: '21 天打卡挑战', sub: '群聊挑战 · 6 人参加 · 每天打卡', badge: '进行中', progressText: '第 10 / 21 天', myText: '我已打卡 8 天 · 第 2 名', pct: 48, open: true });
    expect(c.rank.map((r) => [r.no, r.name, r.value])).toEqual([[1, '阿杰', '9 天'], [2, '我', '8 天']]);
    expect(c.rank[1].bg).toBe('#EAF5EA');
  });
  it('shows recruiting and ended states', () => {
    const rec = buildSocialVM({ challenges: [{ ...view, challenge: { ...view.challenge, recruiting: true } }], openId: null, buddies: [], profile: DEFAULT_PROFILE, infoOpen: null, sheet });
    expect(rec.challenges[0]).toMatchObject({ badge: '招募中', open: false, canInvite: true });
    const end = buildSocialVM({ challenges: [{ ...view, challenge: { ...view.challenge, status: 'ended' }, me: { rank: 2, days: 21, complete: true } }], openId: null, buddies: [], profile: DEFAULT_PROFILE, infoOpen: null, sheet });
    expect(end.challenges[0]).toMatchObject({ badge: '已结束', canSettle: true, myText: '已完成 · 打卡 21 天 · 第 2 名' });
    expect(end.challengesDone).toBe(1);
  });
  it('ports buddy rows and the privacy note', () => {
    const vm = buildSocialVM({
      challenges: [], openId: null, profile: { ...DEFAULT_PROFILE, shareDetailToBuddies: false }, infoOpen: null, sheet,
      buddies: [
        { id: 'p1', name: '阿杰', avatar: '', persistDays: 12, trainedToday: true, detail: '背 + 手臂 · 410 kcal', liked: true, nudged: false },
        { id: 'p2', name: '小鹿', avatar: '', persistDays: 0, trainedToday: false, detail: '', liked: false, nudged: false },
      ],
    });
    expect(vm.buddies[0]).toMatchObject({ status: '今天已练 · 背 + 手臂 · 410 kcal', actText: '已点赞', initial: '阿', streak: '已坚持 12 天', canDuo: false });
    expect(vm.buddies[1]).toMatchObject({ status: '今天还没练', actText: '拍一拍' });
    expect(vm.privacy).toMatchObject({ on: false, note: '搭子只能看到你是否打卡' });
  });
  it('previews the create sheet', () => {
    const vm = buildSocialVM({ challenges: [], openId: null, buddies: [], profile: DEFAULT_PROFILE, infoOpen: null, sheet: { open: true, days: 21, rule: 'w3', rankBy: 'burn' } });
    expect(vm.sheet.preview).toBe('21 天 · 每周 ≥ 3 次 · 按挑战期消耗。完成挑战的人获得专属徽章。');
    expect(vm.sheet.groups.map((g) => g.items.filter((x) => x.on).map((x) => x.label)[0])).toEqual(['21 天', '每周 3 次', '挑战期消耗']);
  });
});
