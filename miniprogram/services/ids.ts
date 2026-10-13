export function newId(prefix: string, now: number = Date.now()): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
