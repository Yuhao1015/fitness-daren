import { describe, expect, it } from 'vitest';
import { parseLanding, sharePath } from '../../miniprogram/core/share-link';

describe('share links', () => {
  it('builds the landing path', () => {
    expect(sharePath('Ab3dEf7h')).toBe('/pkg-share/pages/landing/landing?s=Ab3dEf7h');
  });
  it('parses query and QR scene', () => {
    expect(parseLanding({ s: 'Ab3dEf7h' })).toBe('Ab3dEf7h');
    expect(parseLanding({ scene: encodeURIComponent('s=Ab3dEf7h') })).toBe('Ab3dEf7h');
    expect(parseLanding({ scene: 'x=1&s=Ab3dEf7h' })).toBe('Ab3dEf7h');
  });
  it('rejects garbage', () => {
    expect(parseLanding({})).toBeNull();
    expect(parseLanding({ s: '../../etc' })).toBeNull();
    expect(parseLanding({ s: 'short' })).toBeNull();
  });
});
