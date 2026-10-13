import type { Profile } from '../core/types';
import type { BuddyItem, ChallengeView } from '../services/social';
import { C, chip, info, type ChipVM, type InfoVM } from './common';

export interface SheetState {
  open: boolean;
  days: 7 | 21 | 30;
  rule: 'daily' | 'w3' | 'w4';
  rankBy: 'days' | 'burn' | 'vol';
}

const RULES = { daily: '每天打卡', w3: '每周 ≥ 3 次', w4: '每周 ≥ 4 次' };
const RANKS = { days: '按打卡天数', burn: '按挑战期消耗', vol: '按训练容量' };
const AVATAR_COLORS = ['#3B6FB6', '#8A63C7', '#C23F6E', '#A04A35', '#B8642A', '#2A9D8F'];

function valueText(rankBy: SheetState['rankBy'], v: number): string {
  return rankBy === 'burn' ? `${v} kcal` : rankBy === 'vol' ? `${(v / 1000).toFixed(1)} 吨` : `${v} 天`;
}

export interface SocialInput {
  challenges: ChallengeView[];
  openId: string | null;
  buddies: BuddyItem[];
  profile: Profile;
  infoOpen: string | null;
  sheet: SheetState;
}

export function buildSocialVM(i: SocialInput) {
  const challenges = i.challenges.map((v) => {
    const c = v.challenge;
    const ended = c.status === 'ended';
    const me = v.me ?? { rank: 0, days: 0, complete: false };
    const badge = ended ? ['已结束', C.CHIP_OFF, C.TEXT2] : c.recruiting ? ['招募中', C.WARN_BG, C.WARN_FG] : ['进行中', C.TINT, C.GREEN_DARK];
    return {
      key: c.id, id: c.id, name: c.title,
      sub: `${c.groupId ? '群聊挑战' : '好友挑战'} · ${c.memberCount} 人参加 · ${RULES[c.rule]}`,
      badge: badge[0], badgeBg: badge[1], badgeFg: badge[2],
      progressText: ended ? `已于 ${Number(c.endDate.slice(5, 7))}月${Number(c.endDate.slice(8))}日结束` : `第 ${c.dayIndex} / ${c.days} 天`,
      myText: ended
        ? `${me.complete ? '已完成' : '未完成'} · 打卡 ${me.days} 天 · 第 ${me.rank} 名`
        : `我已打卡 ${me.days} 天 · 第 ${me.rank} 名`,
      pct: Math.round((Math.min(c.dayIndex, c.days) / c.days) * 100),
      open: i.openId === c.id,
      canInvite: !ended,
      canSettle: ended,
      rank: v.rank.map((r, idx) => ({
        key: `${c.id}-${idx}`, no: idx + 1, name: r.isMe ? '我' : r.name, avatar: r.avatar, initial: Array.from(r.name)[0] || '·',
        av: r.isMe ? C.GREEN : AVATAR_COLORS[idx % AVATAR_COLORS.length], value: valueText(c.rankBy, r.value),
        bg: r.isMe ? C.TINT : 'transparent', weight: r.isMe ? 700 : 400, noFg: idx < 3 ? C.GREEN_DARK : C.TEXT3,
      })),
    };
  });

  const buddies = i.buddies.map((b, idx) => {
    const on = b.trainedToday ? b.liked : b.nudged;
    return {
      key: b.id, id: b.id, name: b.name, avatar: b.avatar, initial: Array.from(b.name)[0] || '·', av: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      streak: `已坚持 ${b.persistDays} 天`,
      status: b.trainedToday ? `今天已练 · ${b.detail || '已打卡'}` : '今天还没练',
      statusFg: b.trainedToday ? C.GREEN_DARK : C.TEXT2,
      actText: b.trainedToday ? (b.liked ? '已点赞' : '点赞') : b.nudged ? '已提醒' : '拍一拍',
      actAria: b.trainedToday ? `给${b.name}点赞` : `提醒${b.name}去训练`,
      actOn: on, actBg: on ? C.TINT : '#FFFFFF', actFg: on ? C.GREEN_DARK : C.INK, actBd: on ? C.GREEN : C.BORDER,
      trained: b.trainedToday,
      canDuo: false,
    };
  });

  const s = i.sheet;
  const group = (label: string, field: keyof Omit<SheetState, 'open'>, items: [string | number, string][]) => ({
    key: field, label, field,
    items: items.map(([v, l]) => ({ ...chip(String(v), l, s[field] === v), field })),
  });

  return {
    challenges,
    challengesDone: i.challenges.filter((v) => v.challenge.status === 'ended' && v.me && v.me.complete).length,
    buddies,
    privacy: {
      on: i.profile.shareDetailToBuddies,
      note: i.profile.shareDetailToBuddies ? '搭子能看到你练了哪些部位和消耗' : '搭子只能看到你是否打卡',
      swBg: i.profile.shareDetailToBuddies ? C.GREEN : C.MUTED,
      knob: i.profile.shareDetailToBuddies ? 38 : 0,
    },
    sheet: {
      open: s.open,
      groups: [
        group('挑战时长', 'days', [[7, '7 天'], [21, '21 天'], [30, '30 天']]),
        group('打卡规则', 'rule', [['daily', '每天'], ['w3', '每周 3 次'], ['w4', '每周 4 次']]),
        group('排行依据', 'rankBy', [['days', '打卡天数'], ['burn', '挑战期消耗'], ['vol', '训练容量']]),
      ] as { key: string; label: string; field: string; items: (ChipVM & { field: string })[] }[],
      preview: `${s.days} 天 · ${RULES[s.rule]} · ${RANKS[s.rankBy]}。完成挑战的人获得专属徽章。`,
    },
    info: {
      challenge: info(i.infoOpen, 'challenge', '加入挑战后，每次完成训练会自动打卡。挑战和搭子都不要求分享，完成只奖励徽章。'),
      buddy: info(i.infoOpen, 'buddy', '搭子之间互相看得到对方是否打卡；是否展示训练部位和消耗，由下方的开关决定。'),
    } as Record<string, InfoVM>,
  };
}

export type SocialVM = ReturnType<typeof buildSocialVM>;
