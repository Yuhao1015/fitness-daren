import { IDLE, adjustRest, remaining, startRest, type RestTimer } from './timer';

/**
 * 组间休息计时：今日页列表和专注模式共用同一个（由 services/rest.ts 持有唯一实例），
 * 所以从专注模式回到列表、或在列表里打勾后进专注模式，倒计时都不会丢。
 * 只存结束时间戳，切到后台再回来剩余时间依然准确（spec §9.4）。
 */
export class RestClock {
  timer: RestTimer = IDLE;
  /** 正在为哪个动作休息；空串 = 没在休息 */
  exId = '';
  private fired = true;

  start(exId: string, seconds: number, now: number): void {
    this.timer = startRest(now, seconds);
    this.exId = exId;
    this.fired = false;
  }

  adjust(delta: number, now: number): void {
    this.timer = adjustRest(this.timer, now, delta);
    if (this.timer.endsAt === null) this.reset();
  }

  skip(): void {
    this.reset();
  }

  left(now: number): number {
    return remaining(this.timer, now);
  }

  /** 心跳：倒计时刚走完时返回 true（只返回一次，调用方据此长振动），随后回到空闲 */
  tick(now: number): boolean {
    if (this.timer.endsAt === null || remaining(this.timer, now) > 0) return false;
    const fire = !this.fired;
    this.reset();
    return fire;
  }

  private reset(): void {
    this.timer = IDLE;
    this.exId = '';
    this.fired = true;
  }
}
