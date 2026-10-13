import { base64 } from './base64';

export function svgUri(svg: string): string {
  return 'data:image/svg+xml;base64,' + base64(svg);
}
