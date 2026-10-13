/** 原型画布宽度（px）。小程序设计宽度固定 750rpx。 */
export const PROTO_WIDTH = 390;

/** 原型 px → 小程序 rpx。1px 描边不要用它换算，保持 1px。 */
export function pxToRpx(px: number): number {
  return Math.round((px * 750) / PROTO_WIDTH);
}
