import { describe, expect, it } from 'vitest';
import { APP_NAME, CLOUD_ENV } from '../miniprogram/config';

describe('smoke', () => {
  it('exposes app config', () => {
    expect(APP_NAME).toBe('健身达人');
    expect(typeof CLOUD_ENV).toBe('string');
  });
});
