export interface InboxRow {
  key: string;
  kind: 'open' | 'convert' | 'like' | 'nudge' | 'buddy' | 'join';
  typeName?: string;
  names?: string[];
  count?: number;
  name?: string;
  text?: string;
  at: number;
  unread: boolean;
}

export function inboxText(r: InboxRow): string {
  if (r.kind === 'open') {
    const names = r.names ?? [];
    const more = (r.count ?? 0) > names.length ? ` 等 ${r.count} 位好友` : '';
    return `${names.join('、')}${more}打开了你的${r.typeName ?? '分享'}`;
  }
  if (r.kind === 'convert') return `${r.name ?? '一位好友'}因为你的${r.typeName ?? '分享'}完成了第一次训练`;
  return r.text ?? '';
}

export function buildInboxVM(rows: InboxRow[], unread: number) {
  return {
    show: rows.length > 0,
    unread,
    headline: rows.length ? inboxText(rows[0]) : '',
    items: rows.map((r) => ({ key: r.key, text: inboxText(r), unread: r.unread, strong: r.kind === 'convert' })),
  };
}
