import { CLOUD_ENV } from '../config';
import type { CloudApi } from './sync';

export function cloudEnabled(): boolean {
  return !!CLOUD_ENV && typeof wx !== 'undefined' && !!wx.cloud;
}

export function initCloud(): void {
  if (cloudEnabled()) wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
}

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
  }
}

interface ApiResult {
  ok: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}

export const wxCloudApi: CloudApi = {
  async call<T>(action: string, data?: unknown): Promise<T> {
    const res = await wx.cloud.callFunction({ name: 'api', data: { action, data } });
    const r = res.result as ApiResult | undefined;
    if (!r || !r.ok) throw new ApiError(r && r.code ? r.code : 'NO_RESULT', r && r.message);
    return r.data as T;
  },
};
