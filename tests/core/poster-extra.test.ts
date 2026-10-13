import { describe, expect, it } from 'vitest';
import type { Measure, PosterSpec } from '../../miniprogram/core/poster/types';
import { buildBadgeCard, buildDuoPoster, buildPersonaCard, buildSettlePoster } from '../../miniprogram/core/poster/extra';

const measure: Measure = (t, size) => Array.from(t).length * size * 0.6;
const ok = (s: PosterSpec) => s.ops.every((o) => Object.values(o).every((v) => typeof v !== 'number' || Number.isFinite(v)));
const texts = (s: PosterSpec) => s.ops.filter((o) => o.k === 'text').map((o) => (o as { text: string }).text);

describe('extra share artifacts', () => {
  it('renders badge and persona cards at 5:4', () => {
    const b = buildBadgeCard({ appName: '健身达人', name: '引路人', desc: '带来 1 位好友完成首次训练', color: '#2E7D4F', icon: '/assets/icons/share-white.png', dateText: '10月10日获得' }, measure);
    expect([b.width, b.height, ok(b)]).toEqual([500, 400, true]);
    expect(texts(b)).toEqual(expect.arrayContaining(['引路人', '我也来挑战 →']));
    const p = buildPersonaCard({ appName: '健身达人', name: '夜行 · 规律派 · 胸肌爱好者', desc: '下班后准时报到的夜行者，汗水是一天的句号。', color: '#E07B39', predicted: false }, measure);
    expect(ok(p)).toBe(true);
    expect(texts(p)).toContain('测测你是哪种健身人格 →');
  });
  it('renders the settlement poster with an avatar wall', () => {
    const members = Array.from({ length: 15 }, (_, i) => ({ name: '成员' + i, avatar: i % 2 ? '/tmp/a.png' : null }));
    const s = buildSettlePoster({ appName: '健身达人', title: '21 天打卡挑战', period: '9月20日 – 10月10日', rankText: '第 2 名 / 15 人', stamp: '21 / 21 全勤', complete: true, members, qr: null }, measure);
    expect(ok(s)).toBe(true);
    expect(texts(s)).toEqual(expect.arrayContaining(['21 天打卡挑战', '第 2 名 / 15 人', '21 / 21 全勤', '+3']));
    expect(s.images).toEqual(['/tmp/a.png']);
  });
  it('renders the duo poster', () => {
    const d = buildDuoPoster({ appName: '健身达人', date: '2026.10.10 周六', a: { name: '我', avatar: null, line: '胸 + 腹' }, b: { name: '阿杰', avatar: '/tmp/b.png', line: '背 + 手臂 · 410 kcal' } }, measure);
    expect(ok(d)).toBe(true);
    expect(texts(d)).toEqual(expect.arrayContaining(['今天我们都练了', '我', '阿杰']));
  });
});
