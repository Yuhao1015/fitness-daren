import { describe, expect, it } from 'vitest';
import {
  CARDIO_TYPES, EXERCISES, PARTS, PART_IDS, PROGRESS_LIFTS, TEMPLATES,
  exerciseById, exercisesOf, partById, restSeconds, sortParts, templateById,
} from '../../miniprogram/core/catalog';

describe('catalog', () => {
  it('keeps the prototype part order and colors', () => {
    expect(PART_IDS).toEqual(['leg', 'chest', 'arm', 'shoulder', 'back', 'core', 'cardio']);
    expect(partById('cardio').color).toBe('#D1497A');
  });
  it('has four exercises per strength part with unique ids', () => {
    for (const p of PARTS.filter((x) => x.id !== 'cardio')) {
      expect(exercisesOf(p.id as Exclude<typeof p.id, 'cardio'>)).toHaveLength(4);
    }
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it('marks plank as seconds and bodyweight moves as null weight', () => {
    expect(exerciseById('plank')?.unit).toBe('secs');
    expect(exerciseById('push-up')?.defaultW).toBeNull();
    expect(exerciseById('bench-press')?.defaultW).toBe(50);
  });
  it('rests longer after compound lifts', () => {
    expect(restSeconds(exerciseById('squat')!)).toBe(120);
    expect(restSeconds(exerciseById('lateral-raise')!)).toBe(90);
  });
  it('sorts and dedupes parts by catalog order', () => {
    expect(sortParts(['core', 'chest', 'core'])).toEqual(['chest', 'core']);
  });
  it('references only valid parts and lifts', () => {
    for (const t of TEMPLATES) for (const d of t.cycle) for (const p of d.parts) expect(PART_IDS).toContain(p);
    for (const id of PROGRESS_LIFTS) expect(exerciseById(id)).toBeDefined();
    expect(templateById('ppl').name).toBe('推 / 拉 / 腿');
    expect(CARDIO_TYPES.map((c) => c.id)).toEqual(['run', 'bike', 'ellip', 'rope', 'other']);
  });
});
