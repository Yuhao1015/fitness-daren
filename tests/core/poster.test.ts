import { describe, expect, it } from 'vitest';
import type { Measure, Op, PosterSpec } from '../../miniprogram/core/poster/types';
import { fitText, wrapText } from '../../miniprogram/core/poster/text';
import { buildCheckinPoster, type CheckinPosterData } from '../../miniprogram/core/poster/checkin';
import { buildReportPoster } from '../../miniprogram/core/poster/report';
import { buildDishCard, buildPlanCard } from '../../miniprogram/core/poster/cards';

// 假测量：每个字符宽 0.6 × 字号
const measure: Measure = (t, size) => Array.from(t).length * size * 0.6;

function allFinite(spec: PosterSpec): boolean {
  return spec.ops.every((op) => Object.values(op).every((v) => typeof v !== 'number' || Number.isFinite(v))) && Number.isFinite(spec.height);
}
const texts = (spec: PosterSpec) => spec.ops.filter((o): o is Extract<Op, { k: 'text' }> => o.k === 'text');

const base: CheckinPosterData = {
  appName: '健身达人', date: '2026.10.10 周六', persistDays: 6, sub: '今日训练已完成',
  parts: [{ color: '#E07B39', icon: '/assets/icons/part-chest-white.png' }, { color: '#C99A1E', icon: '/assets/icons/part-core-white.png' }],
  doneSets: 12, volume: 3200, burn: 160, pr: '新纪录 · 杠铃卧推 55kg（之前最高 52.5kg）', fun: '今天举起的总重量 ≈ 3.2 架三角钢琴的 2 倍',
  monthLabel: '10 月打卡', monthDone: 6,
  heat: [...Array(3).fill({ bg: 'transparent', ring: 'transparent' }), ...Array(31).fill({ bg: '#EEF2EE', ring: 'transparent' })],
  serial: 'No.032', qr: '/tmp/qr.png', trophyIcon: '/assets/icons/trophy-warn.png',
};

describe('text helpers', () => {
  it('shrinks then ellipsizes', () => {
    expect(fitText('短', 100, 14, 11, 600, 'body', measure)).toEqual({ text: '短', size: 14 });
    const r = fitText('一'.repeat(40), 234, 14, 11, 600, 'body', measure);
    expect(r.size).toBe(11);
    expect(r.text.endsWith('…')).toBe(true);
    expect(measure(r.text, r.size, 600, 'body')).toBeLessThanOrEqual(234);
  });
  it('wraps by characters and ellipsizes the last line', () => {
    expect(wrapText('一二三四五六', 30, 10, 400, 'body', measure)).toEqual(['一二三四五', '六']);
    const lines = wrapText('一'.repeat(30), 30, 10, 400, 'body', measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });
});

describe('checkin poster', () => {
  it('lays out the prototype poster with serial and QR', () => {
    const spec = buildCheckinPoster(base, measure);
    expect(spec.width).toBe(310);
    expect(allFinite(spec)).toBe(true);
    expect(spec.height).toBeGreaterThan(420);
    const t = texts(spec).map((x) => x.text);
    expect(t).toEqual(expect.arrayContaining(['健身达人', '2026.10.10 周六', '6', '天坚持打卡', '今日训练已完成', '12', '3200', '160', 'No.032', '长按识别小程序码']));
    expect(spec.images).toEqual(expect.arrayContaining(['/assets/icons/part-chest-white.png', '/tmp/qr.png', '/assets/icons/trophy-warn.png']));
    const label = texts(spec).find((x) => x.text === '天坚持打卡')!;
    expect(label.x).toBeCloseTo(20 + measure('6', 64, 700, 'num') + 8);
  });
  it('fits a very long PR line inside the card', () => {
    const spec = buildCheckinPoster({ ...base, pr: '新纪录 · ' + '超长动作名'.repeat(10) }, measure);
    const pr = texts(spec).find((x) => x.text.startsWith('新纪录'))!;
    expect(pr.text.endsWith('…')).toBe(true);
    expect(pr.x + measure(pr.text, pr.size, 600, 'body')).toBeLessThanOrEqual(290);
  });
  it('handles 7 parts, no PR, no fun line and no QR', () => {
    const parts = Array(7).fill({ color: '#3B6FB6', icon: '/assets/icons/part-leg-white.png' });
    const spec = buildCheckinPoster({ ...base, parts, pr: '', fun: '', qr: null }, measure);
    expect(allFinite(spec)).toBe(true);
    const circles = spec.ops.filter((o) => o.k === 'circle') as Extract<Op, { k: 'circle' }>[];
    expect(Math.max(...circles.map((c) => c.cx + c.r))).toBeLessThanOrEqual(290);
    expect(texts(spec).map((x) => x.text)).toContain('微信搜索「健身达人」');
    expect(spec.images).not.toContain('/tmp/qr.png');
    expect(spec.ops.some((o) => o.k === 'rect' && o.fill === '#FDF1E7')).toBe(false);
  });
});

describe('report poster and share cards', () => {
  it('lays out the monthly report', () => {
    const spec = buildReportPoster({
      appName: '健身达人', monthLabel: '2026 年 10 月', title: '10 月训练报告', days: 14, persona: '胸肌爱好者',
      tons: '12.4', burn: 3400, prs: 3,
      dist: [{ name: '胸', color: '#E07B39', count: 6, pct: 100 }, { name: '背', color: '#B5523B', count: 3, pct: 50 }],
      fun: '本月举起的总重量 ≈ 2.1 头非洲象', heat: base.heat, qr: null,
    }, measure);
    expect(allFinite(spec)).toBe(true);
    expect(texts(spec).map((x) => x.text)).toEqual(expect.arrayContaining(['10 月训练报告', '14', '天打卡', '胸肌爱好者', '12.4', '6 次']));
  });
  it('adds the weekly streak to the monthly report only when there is one', () => {
    const base = {
      appName: '健身达人', monthLabel: '2026 年 10 月', title: '10 月训练报告', days: 14, persona: '胸肌爱好者',
      tons: '12.4', burn: 3400, prs: 3, dist: [], fun: '', heat: [], qr: null,
    };
    expect(texts(buildReportPoster({ ...base, weekStreak: 5 }, measure)).map((x) => x.text)).toContain('连续达标 5 周');
    expect(texts(buildReportPoster({ ...base, weekStreak: 0 }, measure)).some((x) => x.text.startsWith('连续达标'))).toBe(false);
    expect(texts(buildReportPoster(base, measure)).some((x) => x.text.startsWith('连续达标'))).toBe(false);
  });

  it('renders 5:4 dish and plan cards', () => {
    const dish = buildDishCard({ appName: '健身达人', name: '牛肉糙米能量碗', kcal: 408, p: 35, tint: '#F2E6BF', layers: ['/assets/dish/bowl.back.png', '/assets/dish/bowl.front.png'] }, measure);
    expect([dish.width, dish.height]).toEqual([500, 400]);
    expect(dish.images).toEqual(['/assets/dish/bowl.back.png', '/assets/dish/bowl.front.png']);
    expect(texts(dish).map((x) => x.text)).toContain('408 kcal · 蛋白质 35g');
    const plan = buildPlanCard({ appName: '健身达人', name: '推 / 拉 / 腿', days: [{ label: '推 · 胸肩臂', rest: false }, { label: '休息', rest: true }] }, measure);
    expect(allFinite(plan)).toBe(true);
    expect(texts(plan).map((x) => x.text)).toEqual(expect.arrayContaining(['我在用「推 / 拉 / 腿」', '推 · 胸肩臂', '休息', '一键套用到你的日历']));
  });
});
