import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../../miniprogram/core/catalog';
import { ICONS, iconSvg, liftIcon } from '../../miniprogram/core/icons';
import { CROPS, cropTransform, muscleBody } from '../../miniprogram/core/muscle';

/** 把图标按红色渲染成 64 × 64 的位图，统计「实心」与「淡剪影」像素占比 */
function coverage(name: string): { solid: number; faint: number } {
  const r = new Resvg(iconSvg(name, '#FF0000'), { fitTo: { mode: 'width', value: 64 } }).render();
  const px = r.pixels;
  let solid = 0;
  let faint = 0;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] >= 230) solid++;
    else if (px[i] >= 40 && px[i] <= 110) faint++;
  }
  const total = r.width * r.height;
  return { solid: solid / total, faint: faint / total };
}

describe('muscle icons', () => {
  it('scales a crop box to fill the 32 canvas and centres it', () => {
    expect(cropTransform({ x: 0, y: 0, w: 32, h: 32 })).toBe('translate(0 0) scale(1)');
    for (const c of Object.values(CROPS)) {
      const m = /translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)/.exec(cropTransform(c))!;
      const [tx, ty, s] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect((c.x + c.w / 2) * s + tx).toBeCloseTo(16, 1);
      expect((c.y + c.h / 2) * s + ty).toBeCloseTo(16, 1);
      expect(Math.max(c.w, c.h) * s).toBeCloseTo(32, 1);
    }
  });

  it('draws a faint silhouette under the highlighted muscles, mirrored left and right', () => {
    const body = muscleBody('front', ['pec'], CROPS.torso);
    expect(body).toContain('opacity=".27"');
    expect(body).toContain('matrix(-1 0 0 1 64 0)');
    expect(body.indexOf('opacity=".27"')).toBeLessThan(body.lastIndexOf('fill="currentColor"'));
    expect(muscleBody('front', [], CROPS.torso)).not.toEqual(body);
  });

  it('refuses to highlight a muscle that is not visible from that side', () => {
    expect(() => muscleBody('front', ['triceps'], CROPS.arms)).toThrow(/triceps/);
    expect(() => muscleBody('back', ['abs'], CROPS.core)).toThrow(/abs/);
  });

  it('gives every training part its own picture', () => {
    const bodies = PART_IDS.filter((p) => p !== 'cardio').map((p) => ICONS['part-' + p].body);
    expect(new Set(bodies).size).toBe(bodies.length);
    for (const b of bodies) expect(b).toContain('opacity=".27"');
  });

  it('renders each part as a visible highlight on a visible silhouette (not blank, not flooded)', () => {
    for (const p of PART_IDS.filter((x) => x !== 'cardio')) {
      const c = coverage('part-' + p);
      expect(c.solid, `${p} highlight`).toBeGreaterThan(0.03);
      expect(c.solid, `${p} highlight`).toBeLessThan(0.4);
      expect(c.faint, `${p} silhouette`).toBeGreaterThan(0.05);
    }
  });

  it('keeps colours consistent: every colour in the svg is the one that was asked for', () => {
    for (const p of PART_IDS.filter((x) => x !== 'cardio')) {
      const svg = iconSvg('part-' + p, '#8A63C7');
      expect(svg).not.toContain('currentColor');
      expect(svg).not.toMatch(/NaN|undefined/);
      const colours = new Set(svg.match(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)!.map((m) => m.slice(-8, -1)));
      expect([...colours]).toEqual(['#8A63C7']);
    }
  });

  it('uses the same pictures for the lifts it is the best match for', () => {
    expect(liftIcon('bench-press')).toBe('part-chest');
    expect(liftIcon('squat')).toBe('part-leg');
    expect(liftIcon('db-shoulder-press')).toBe('part-shoulder');
    expect(ICONS[liftIcon('deadlift')]).toBeDefined();
    expect(coverage(liftIcon('deadlift')).solid).toBeGreaterThan(0.03);
  });
});
