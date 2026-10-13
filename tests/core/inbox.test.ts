import { describe, expect, it } from 'vitest';
import { buildInboxVM, inboxText } from '../../miniprogram/core/inbox';

describe('inbox text', () => {
  it('aggregates opens', () => {
    expect(inboxText({ key: 'a', kind: 'open', typeName: '打卡海报', names: ['阿杰', '小鹿', 'Momo'], count: 5, at: 1, unread: true })).toBe('阿杰、小鹿、Momo 等 5 位好友打开了你的打卡海报');
    expect(inboxText({ key: 'b', kind: 'open', typeName: '练后餐卡片', names: ['阿杰'], count: 1, at: 1, unread: false })).toBe('阿杰打开了你的练后餐卡片');
  });
  it('celebrates conversions and passes through server text', () => {
    expect(inboxText({ key: 'c', kind: 'convert', typeName: '打卡海报', name: '小鹿', at: 1, unread: true })).toBe('小鹿因为你的打卡海报完成了第一次训练');
    expect(inboxText({ key: 'd', kind: 'like', text: '阿杰给你今天的训练点了赞', at: 1, unread: true })).toBe('阿杰给你今天的训练点了赞');
  });
  it('builds the inbox card', () => {
    const vm = buildInboxVM([{ key: 'c', kind: 'convert', typeName: '打卡海报', name: '小鹿', at: 1, unread: true }], 1);
    expect(vm).toEqual({ show: true, unread: 1, headline: '小鹿因为你的打卡海报完成了第一次训练', items: [{ key: 'c', text: '小鹿因为你的打卡海报完成了第一次训练', unread: true, strong: true }] });
    expect(buildInboxVM([], 0).show).toBe(false);
  });
});
