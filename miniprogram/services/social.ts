import type { InboxRow } from '../core/inbox';
import type { StorageAdapter } from './store';
import type { CloudApi } from './sync';

/** 动态消息官方模板「开始时」：状态 0「成员正在加入，当前 {member_count}/{room_limit} 人」→ 状态 1「已开始」（开放文档公布的固定 ID，无需申请） */
export const UPDATABLE_TEMPLATE_START = '21B034D08C5615B9889CE362BB957B1EE69A584B';

export interface RankRow { isMe: boolean; name: string; avatar: string; days: number; value: number; complete: boolean }

export interface ChallengeInfo {
  id: string; title: string; days: number; rule: 'daily' | 'w3' | 'w4'; rankBy: 'days' | 'burn' | 'vol';
  startDate: string; endDate: string; status: 'upcoming' | 'running' | 'ended'; recruiting: boolean;
  groupId: string | null; memberCount: number; dayIndex: number; required: number; isCreator: boolean;
}

export interface ChallengeView { challenge: ChallengeInfo; rank: RankRow[]; me: { rank: number; days: number; complete: boolean } | null }

export interface BuddyItem { id: string; name: string; avatar: string; persistDays: number; trainedToday: boolean; detail: string; liked: boolean; nudged: boolean }

export function socialApi(api: CloudApi) {
  return {
    mine: (today: string) => api.call<{ challenges: ChallengeView[] }>('challenge.mine', { today }),
    get: (id: string, today: string) => api.call<ChallengeView>('challenge.get', { challengeId: id, today }),
    create: (p: { days: number; rule: string; rankBy: string; today: string }) => api.call<{ challengeId: string; activityId: string | null }>('challenge.create', p),
    join: (id: string, today: string, group?: unknown) => api.call<{ joined: boolean }>('challenge.join', { challengeId: id, today, group }),
    buddies: (today: string) => api.call<{ buddies: BuddyItem[] }>('buddy.list', { today }),
    like: (pairId: string, today: string) => api.call<{ liked: boolean }>('buddy.like', { pairId, today }),
    nudge: (pairId: string, today: string) => api.call<{ delivered: 'push' | 'inbox' | 'already' }>('buddy.nudge', { pairId, today }),
    accept: (shareId: string) => api.call<{ ok: boolean; name: string }>('buddy.accept', { shareId }),
    inbox: () => api.call<{ items: InboxRow[]; unread: number }>('inbox.list'),
    readInbox: () => api.call('inbox.read'),
    stats: () => api.call<{ opens: number; converts: number }>('inbox.stats'),
    grant: (kind: 'nudge' | 'train' | 'challenge') => api.call<{ credits: number }>('subscribe.grant', { kind }),
  };
}

export interface SocialStats { buddies: number; challengesDone: number; pathfinders: number }

export function loadSocialStats(s: StorageAdapter): SocialStats {
  return { buddies: 0, challengesDone: 0, pathfinders: 0, ...(s.get<Partial<SocialStats>>('social:stats') ?? {}) };
}

export function saveSocialStats(s: StorageAdapter, patch: Partial<SocialStats>): void {
  s.set('social:stats', { ...loadSocialStats(s), ...patch });
}
