// ============================================================
// ホーム:資格・出題モードの選択、続きから再開
// ============================================================
import { EXAM_INFO, QUESTIONS, getQuestionsByCategory } from '../data/questions.js';
import { getResume, getLatestResults, getSummary } from '../storage.js';

export function renderHome(root) {
  const resume = getResume();
  const latest = getLatestResults();
  const summary = getSummary();
  const wrongCount = QUESTIONS.filter((q) => latest.get(q.id)?.correct === false).length;

  const resumeHtml = resume && resume.index < resume.qids.length ? `
    <div class="resume-banner">
      <span>⏸</span>
      <span class="rb-text">前回の続きから再開できます:<strong>${escapeHtml(resume.label)}</strong>(${resume.index + 1}問目から)</span>
      <a class="btn btn-primary" href="#/quiz?mode=resume">再開する</a>
    </div>` : '';

  const catRows = EXAM_INFO.categories.map((c) => {
    const qs = getQuestionsByCategory(c);
    const done = qs.filter((q) => latest.has(q.id)).length;
    return `
      <a class="cat-row" href="#/quiz?cat=${encodeURIComponent(c)}">
        <span class="cn">${c}</span>
        <span class="cs">${done} / ${qs.length} 問学習済み</span>
        <span class="arrow">→</span>
      </a>`;
  }).join('');

  root.innerHTML = `
    <div class="hero">
      <h1>過去問演習を、もっと快適に。</h1>
      <p>${EXAM_INFO.name} — 択の絞り込み・書き込み・弱点模試に対応した学習アプリ(プロトタイプ)</p>
    </div>

    ${resumeHtml}

    <div class="menu-grid">
      <a class="menu-card" href="#/quiz">
        <div class="mi">▶️</div>
        <div class="mt">全問シャッフル演習 <span class="badge badge-free">無料</span></div>
        <div class="md">全${QUESTIONS.length}問からランダム出題。1タップ解答→すぐ次へ。</div>
      </a>
      <a class="menu-card" href="#/quiz?mode=wrong">
        <div class="mi">🔁</div>
        <div class="mt">間違えた問題を復習 <span class="badge badge-free">無料</span></div>
        <div class="md">${wrongCount > 0 ? `現在 ${wrongCount} 問が復習対象です。` : 'まだ復習対象はありません。まず演習しましょう。'}</div>
      </a>
      <a class="menu-card" href="#/exam">
        <div class="mi">⏱</div>
        <div class="mt">模試をつくる <span class="badge badge-premium">✦ プレミアム</span></div>
        <div class="md">統計から弱点分野を重点出題。時間を計って本番形式で。</div>
      </a>
      <a class="menu-card" href="#/stats">
        <div class="mi">📊</div>
        <div class="mt">学習統計</div>
        <div class="md">${summary.total > 0 ? `累計 ${summary.total} 問解答・正答率 ${Math.round(summary.accuracy * 100)}%` : '解答すると分野別の成績が見られます。'}</div>
      </a>
    </div>

    <h2 class="section-title">分野を選んで演習</h2>
    <div class="cat-list">${catRows}</div>

    <h2 class="section-title">このアプリについて</h2>
    <div class="notice">
      基本無料で使えます。模試の自動作成などの一部機能は将来プレミアム(有料)を予定していますが、
      <strong>資格団体の規約で過去問の商用利用が認められない資格については、広告・課金なしの無料提供とします</strong>。
      現在収録している問題は、権利処理不要のオリジナルのサンプル問題です。
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
