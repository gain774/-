// ============================================================
// ビュー間で共有する小物:HTMLエスケープ、◯△✕マーク定義
// ============================================================

export const MARK_CYCLE = ['none', 'maru', 'sankaku', 'batsu'];
export const MARK_ICON = { none: '−', maru: '◯', sankaku: '△', batsu: '✕' };
export const MARK_LABEL = { none: 'マークなし', maru: '有力', sankaku: '保留', batsu: '除外' };

export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
