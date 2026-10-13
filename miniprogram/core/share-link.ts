export const LANDING = '/pkg-share/pages/landing/landing';

export function sharePath(id: string): string {
  return `${LANDING}?s=${id}`;
}

/** 卡片分享带 ?s=，小程序码带 scene=s%3Dxxxx */
export function parseLanding(q: { s?: string; scene?: string }): string | null {
  let id = q.s;
  if (!id && q.scene) {
    const m = decodeURIComponent(q.scene).match(/(?:^|&)s=([^&]+)/);
    id = m ? m[1] : undefined;
  }
  return id && /^[A-Za-z0-9]{8}$/.test(id) ? id : null;
}
