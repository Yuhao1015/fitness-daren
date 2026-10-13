import { describe, expect, it } from 'vitest';
import type { Measure, Op, PosterSpec } from '../../miniprogram/core/poster/types';
import type { CheckinPosterData } from '../../miniprogram/core/poster/checkin';
import { PAPER, buildStampPoster } from '../../miniprogram/core/poster/stamp';

// 假测量：每个字符宽 0.6 × 字号
const measure: Measure = (t, size) => Array.from(t).length * size * 0.6;

const texts = (spec: PosterSpec) => spec.ops.filter((o): o is Extract<Op, { k: 'text' }> => o.k === 'text');
const circles = (spec: PosterSpec) => spec.ops.filter((o): o is Extract<Op, { k: 'circle' }> => o.k === 'circle');
const finite = (spec: PosterSpec) => spec.ops.every((op) => Object.values(op).every((v) => typeof v !== 'number' || Number.isFinite(v))) && Number.isFinite(spec.height);

const base: CheckinPosterData = {
  appName: '健身达人', date: '2026.10.10 周六', persistDays: 6, sub: '今日训练已完成',
  parts: [{ color: '#E07B39', icon: '/assets/icons/part-chest-white.png' }, { color: '#C99A1E', icon: '/assets/icons/part-core-white.png' }],
  doneSets: 12, volume: 3200, burn: 160, pr: '新纪录 · 杠铃卧推 55kg（之前最高 52.5kg）', fun: '今天举起的总重量 ≈ 3.2 架三角钢琴的 2 倍',
  monthLabel: '10 月打卡', monthDone: 6,
  heat: [...Array(3).fill({ bg: 'transparent', ring: 'transparent' }), ...Array(31).fill({ bg: '#EEF2EE', ring: 'transparent' })],
  serial: 'No.032', qr: '/tmp/qr.png', trophyIcon: '/assets/icons/trophy-warn.png',
};

describe('stamp checkin poster', () => {
  it('lays out the stamp with the same data as the classic poster', () => {
    const spec = buildStampPoster(base, measure);
    expect(spec.width).toBe(310);
    expect(finite(spec)).toBe(true);
    expect(spec.height).toBeGreaterThan(420);
    const t = texts(spec).map((x) => x.text);
    expect(t).toEqual(expect.arrayContaining(['健身达人', '6', '天', '今日训练已完成', '12', '3200', '160', 'No.032', '10 月打卡', '长按识别小程序码']));
    expect(spec.images).toEqual(expect.arrayContaining(['/assets/icons/part-chest-white.png', '/tmp/qr.png', '/assets/icons/trophy-warn.png']));
  });

  it('cuts perforations into every edge of the stamp body', () => {
    const spec = buildStampPoster(base, measure);
    const body = spec.ops.find((o) => o.k === 'rect' && o.fill === '#FFFFFF' && o.x === 20) as Extract<Op, { k: 'rect' }>;
    expect(body).toBeTruthy();
    const holes = circles(spec).filter((c) => c.fill === PAPER);
    expect(holes.length).toBeGreaterThan(80);
    const right = body.x + body.w;
    const bottom = body.y + body.h;
    const onEdge = (c: Extract<Op, { k: 'circle' }>) => c.cx === body.x || c.cx === right || c.cy === body.y || c.cy === bottom;
    expect(holes.every((h) => Math.abs(h.cx - body.x) < 1e-6 || Math.abs(h.cx - right) < 1e-6 || Math.abs(h.cy - body.y) < 1e-6 || Math.abs(h.cy - bottom) < 1e-6 || onEdge(h))).toBe(true);
    expect(holes.some((h) => Math.abs(h.cx - body.x) < 1e-6)).toBe(true);
    expect(holes.some((h) => Math.abs(h.cx - right) < 1e-6)).toBe(true);
    expect(holes.some((h) => Math.abs(h.cy - body.y) < 1e-6)).toBe(true);
    expect(holes.some((h) => Math.abs(h.cy - bottom) < 1e-6)).toBe(true);
  });

  it('stamps a tilted postmark with the date, and keeps rotate / restore balanced', () => {
    const spec = buildStampPoster(base, measure);
    const kinds = spec.ops.map((o) => o.k);
    expect(kinds.filter((k) => k === 'rotate')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'restore')).toHaveLength(1);
    const from = kinds.indexOf('rotate');
    const to = kinds.indexOf('restore');
    expect(to).toBeGreaterThan(from);
    const marked = texts({ ...spec, ops: spec.ops.slice(from, to) }).map((t) => t.text);
    expect(marked).toEqual(expect.arrayContaining(['10.10', '周六']));
    const rot = spec.ops[from] as Extract<Op, { k: 'rotate' }>;
    expect(rot.deg).toBeLessThan(0);
  });

  it('keeps 7 part icons inside the printed frame', () => {
    const spec = buildStampPoster({ ...base, parts: Array(7).fill(base.parts[0]) }, measure);
    expect(finite(spec)).toBe(true);
    const rects = spec.ops.filter((o): o is Extract<Op, { k: 'rect' }> => o.k === 'rect');
    expect(rects.every((r) => r.x >= 0 && r.x + r.w <= 310 + 1e-6)).toBe(true);
    const parts = circles(spec).filter((c) => c.ring === '#FFFFFF');
    expect(parts).toHaveLength(7);
    expect(Math.max(...parts.map((c) => c.cx + c.r))).toBeLessThanOrEqual(266);
    expect(Math.min(...parts.map((c) => c.cx - c.r))).toBeGreaterThanOrEqual(44);
  });

  it('puts the fun caption on the paper below the stamp, full width and inside the margins', () => {
    const spec = buildStampPoster({ ...base, fun: '今天举起的总重量 ≈ 6.8 架三角钢琴，这一行故意写得很长很长很长很长很长很长很长很长很长很长很长' }, measure);
    const body = spec.ops.find((o) => o.k === 'rect' && o.fill === '#FFFFFF' && o.x === 20) as Extract<Op, { k: 'rect' }>;
    const fun = texts(spec).filter((t) => t.color === '#4E5E53' && t.align === 'center' && t.size === 12 && t.y > body.y + body.h);
    expect(fun.length).toBeGreaterThan(0);
    expect(fun.length).toBeLessThanOrEqual(2);
    expect(fun[0].text.startsWith('今天举起')).toBe(true);
    for (const f of fun) {
      const w = measure(f.text, f.size, f.weight, f.font);
      expect(f.x - w / 2).toBeGreaterThanOrEqual(20);
      expect(f.x + w / 2).toBeLessThanOrEqual(290);
    }
  });

  it('leaves the postmark corner empty: no stamp content sits under the postmark ring', () => {
    for (const extra of [{}, { pr: '' }, { parts: [] }]) {
      const spec = buildStampPoster({ ...base, ...extra }, measure);
      const from = spec.ops.findIndex((o) => o.k === 'rotate');
      const ring = spec.ops.slice(from).find((o): o is Extract<Op, { k: 'circle' }> => o.k === 'circle')!;
      expect(ring.ring).not.toBeNull();
      // 邮戳之前画出的邮票内容（文字、图片、色块、部位圆；不含白底、印刷框、齿孔）
      const bottoms = spec.ops.slice(0, from).flatMap((o) => {
        if (o.k === 'text') return [o.y + o.size];
        if (o.k === 'image') return [o.y + o.h];
        if (o.k === 'rect' && o.fill && o.fill !== '#FFFFFF' && o.fill !== PAPER) return [o.y + o.h];
        if (o.k === 'circle' && o.fill !== PAPER) return [o.cy + o.r];
        return [];
      });
      expect(Math.max(...bottoms)).toBeLessThanOrEqual(ring.cy - ring.r + 0.5);
    }
  });

  it('fits a very long PR line, and survives no PR / no fun line / no QR', () => {
    const long = buildStampPoster({ ...base, pr: '新纪录 · ' + '超长动作名'.repeat(10) }, measure);
    const pr = texts(long).find((x) => x.text.startsWith('新纪录'))!;
    expect(pr.text.endsWith('…')).toBe(true);
    expect(pr.x + measure(pr.text, pr.size, 600, 'body')).toBeLessThanOrEqual(266);

    const bare = buildStampPoster({ ...base, pr: '', fun: '', qr: null, parts: [] }, measure);
    expect(finite(bare)).toBe(true);
    expect(texts(bare).map((x) => x.text)).toContain('微信搜索「健身达人」');
    expect(bare.images).not.toContain('/tmp/qr.png');
    expect(bare.ops.some((o) => o.k === 'rect' && o.fill === '#FDF1E7')).toBe(false);
    expect(bare.height).toBeLessThan(long.height);
  });

  it('recolours the month grid so empty days stay visible on the paper', () => {
    const spec = buildStampPoster(base, measure);
    expect(spec.ops.some((o) => o.k === 'rect' && o.fill === '#EEF2EE')).toBe(false);
  });

  it('copes with an unexpected date string', () => {
    const spec = buildStampPoster({ ...base, date: '今天' }, measure);
    expect(finite(spec)).toBe(true);
    expect(texts(spec).map((x) => x.text)).toContain('今天');
  });
});
