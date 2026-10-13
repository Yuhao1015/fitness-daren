export interface RestTimer {
  endsAt: number | null;
  total: number;
}

export const IDLE: RestTimer = { endsAt: null, total: 0 };

export function startRest(now: number, seconds: number): RestTimer {
  return { endsAt: now + seconds * 1000, total: seconds };
}

/** 用结束时间戳计算剩余秒数：切到后台再回来依然准确（spec §9.4） */
export function remaining(t: RestTimer, now: number): number {
  return t.endsAt === null ? 0 : Math.max(0, Math.ceil((t.endsAt - now) / 1000));
}

export function adjustRest(t: RestTimer, now: number, delta: number): RestTimer {
  if (t.endsAt === null) return t;
  const left = remaining(t, now) + delta;
  if (left <= 0) return IDLE;
  return { endsAt: now + left * 1000, total: Math.max(t.total, left) };
}

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** 减到 0 即变为自重（null） */
export function stepWeight(w: number | null, delta: number): number | null {
  const next = Math.round(((w ?? 0) + delta) * 10) / 10;
  return next <= 0 ? null : Math.min(500, next);
}

export function stepReps(r: number, delta: number): number {
  return Math.max(0, Math.min(1000, r + delta));
}
