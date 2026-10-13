import { describe, expect, it } from 'vitest';
import { base64 } from '../../miniprogram/core/base64';
import { svgUri } from '../../miniprogram/core/svg';

describe('base64', () => {
  it('matches Node for ascii, chinese and emoji-free svg text', () => {
    for (const s of ['', 'a', 'ab', 'abc', '<svg stroke="#FFFFFF"/>', '健身达人 · 已坚持 6 天', '𠮷']) {
      expect(base64(s)).toBe(Buffer.from(s, 'utf8').toString('base64'));
    }
  });
  it('wraps svg into a data uri', () => {
    expect(svgUri('<svg/>')).toBe('data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'));
  });
});
