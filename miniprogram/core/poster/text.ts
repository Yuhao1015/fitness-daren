import type { FontKind, Measure, Weight } from './types';

export function fitText(text: string, maxW: number, size: number, minSize: number, weight: Weight, font: FontKind, measure: Measure): { text: string; size: number } {
  let s = size;
  while (s > minSize && measure(text, s, weight, font) > maxW) s -= 1;
  if (measure(text, s, weight, font) <= maxW) return { text, size: s };
  const chars = Array.from(text);
  while (chars.length > 1 && measure(chars.join('') + '…', s, weight, font) > maxW) chars.pop();
  return { text: chars.join('') + '…', size: s };
}

export function wrapText(text: string, maxW: number, size: number, weight: Weight, font: FontKind, measure: Measure, maxLines = 3): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < chars.length; i++) {
    const next = cur + chars[i];
    if (cur && measure(next, size, weight, font) > maxW) {
      lines.push(cur);
      cur = chars[i];
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines) {
    if (cur) lines.push(cur);
    return lines;
  }
  const rest = lines[maxLines - 1] + chars.slice(i).join('');
  lines[maxLines - 1] = fitText(rest, maxW, size, size, weight, font, measure).text;
  return lines;
}
