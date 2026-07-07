// ============================================================
// カコモン+ エントリポイント:ハッシュルーター + テーマ
// ============================================================
import { getSettings, updateSettings } from './storage.js';
import { renderHome } from './views/home.js';
import { renderQuiz } from './views/quiz.js';
import { renderExam } from './views/exam.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';

const routes = {
  '': renderHome,
  'quiz': renderQuiz,
  'exam': renderExam,
  'stats': renderStats,
  'settings': renderSettings,
};

const app = document.getElementById('app');
let cleanup = null; // 現在のビューの後始末(タイマー・キーリスナー解除)

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return { path: path || '', params };
}

function render() {
  if (typeof cleanup === 'function') {
    cleanup();
    cleanup = null;
  }
  const { path, params } = parseHash();
  const view = routes[path] || renderHome;

  app.innerHTML = '';
  app.classList.remove('fade-in');
  // reflow でアニメーションを再トリガー
  void app.offsetWidth;
  app.classList.add('fade-in');

  cleanup = view(app, params) || null;

  // ナビのアクティブ表示
  const navKey = path === '' ? 'home' : path.split('/')[0];
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === navKey);
  });

  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ---------------- テーマ ----------------
function applyTheme() {
  const { theme } = getSettings();
  const dark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  updateSettings({ theme: isDark ? 'light' : 'dark' });
  applyTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();
window.addEventListener('hashchange', render);
render();
