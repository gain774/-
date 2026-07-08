// ============================================================
// ホーム:資格の切替、解答方式の切替、出題モード・分野の選択、再開
// ============================================================
import { getAllExams, getActiveExam } from '../data/questions.js';
import { getResume, getLatestResults, getSummary, getSettings, updateSettings } from '../storage.js';
import { escapeHtml } from '../utils.js';

export function renderHome(root) {
  const exam = getActiveExam();
  const questions = exam.questions;
  const qidSet = new Set(questions.map((q) => q.id));
  const resume = getResume();
  const latest = getLatestResults();
  const summary = getSummary(qidSet);
  const settings = getSettings();
  const wrongCount = questions.filter((q) => latest.get(q.id)?.correct === false).length;

  const resumeHtml = resume && resume.index < resume.qids.length ? `
    <div class="resume-banner">
      <span class="rb-text">前回の続きから再開できます:<strong>${escapeHtml(resume.label)}</strong>(${resume.index + 1}問目から)</span>
      <a class="btn btn-primary" href="#/quiz?mode=resume">再開する</a>
    </div>` : '';

  const catRows = exam.categories.map((c) => {
    const qs = questions.filter((q) => q.category === c);
    const done = qs.filter((q) => latest.has(q.id)).length;
    return `
      <a class="cat-row" href="#/quiz?cat=${encodeURIComponent(c)}">
        <span class="cn">${escapeHtml(c)}</span>
        <span class="cs">${done} / ${qs.length} 問学習済み</span>
        <span class="arrow">→</span>
      </a>`;
  }).join('');

  root.innerHTML = `
    <div class="hero">
      <h1>過去問演習を、もっと快適に。</h1>
      <p>択の絞り込み・書き込み・弱点模試に対応した学習アプリ(プロトタイプ)</p>
    </div>

    <div class="answer-mode-row">
      <span class="am-label">資格</span>
      <select class="select" id="exam-select" style="flex:1; min-width:220px">
        ${getAllExams().map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === exam.id ? 'selected' : ''}>${escapeHtml(e.name)}(${e.questions.length}問)</option>`).join('')}
      </select>
      <a class="btn" href="#/import">問題データの管理</a>
      <p class="am-desc">${escapeHtml(exam.description || '')}</p>
    </div>

    ${resumeHtml}

    <div class="answer-mode-row">
      <span class="am-label">解答方式</span>
      <div class="seg" role="radiogroup" aria-label="解答方式">
        <button type="button" data-am="each" class="${settings.answerMode === 'each' ? 'active' : ''}">一問一答</button>
        <button type="button" data-am="end" class="${settings.answerMode === 'end' ? 'active' : ''}">まとめて採点</button>
      </div>
      <p class="am-desc" id="am-desc">${amDesc(settings.answerMode)}</p>
    </div>

    <div class="menu-grid">
      <a class="menu-card" href="#/practice">
        <div class="mt">演習をはじめる</div>
        <div class="md">年度・区分・分野・出題順・解答方式を選んで出題(全${questions.length}問収録)。</div>
      </a>
      <a class="menu-card" href="#/quiz?mode=wrong">
        <div class="mt">間違えた問題を復習</div>
        <div class="md">${wrongCount > 0 ? `現在 ${wrongCount} 問が復習対象です。` : 'まだ復習対象はありません。まず演習しましょう。'}</div>
      </a>
      <a class="menu-card" href="#/exam">
        <div class="mt">模試をつくる <span class="badge badge-free">無料</span></div>
        <div class="md">統計から弱点分野を重点出題。時間を計って本番形式で。</div>
      </a>
      <a class="menu-card" href="#/stats">
        <div class="mt">学習統計</div>
        <div class="md">${summary.total > 0 ? `累計 ${summary.total} 問解答・正答率 ${Math.round(summary.accuracy * 100)}%` : '解答すると分野別の成績が見られます。'}</div>
      </a>
    </div>

    <h2 class="section-title">分野を選んで演習</h2>
    <div class="cat-list">${catRows}</div>

    <h2 class="section-title">このアプリについて</h2>
    <div class="notice">
      現在の機能はすべて無料です。将来一部機能を有料化する場合も、
      <strong>資格団体の規約で過去問の商用利用が認められない資格については、広告・課金なしの無料提供とします</strong>。
      収録している問題は、出題形式に合わせて作成した権利処理不要のオリジナル問題です。
      権利確認済みの実際の過去問は<a href="#/import">問題データの管理</a>から取り込めます。
      お気づきの点は<a href="#/feedback">フィードバック</a>からお寄せください。
    </div>
  `;

  // 資格の切替(履歴・統計は資格ごとに自動で切り替わる)
  root.querySelector('#exam-select').addEventListener('change', (e) => {
    updateSettings({ examId: e.target.value });
    renderHome(root);
  });

  // 解答方式の切替(設定に即保存され、すべての演習に適用)
  root.querySelectorAll('[data-am]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateSettings({ answerMode: btn.dataset.am });
      root.querySelectorAll('[data-am]').forEach((b) => b.classList.toggle('active', b === btn));
      root.querySelector('#am-desc').textContent = amDesc(btn.dataset.am);
    });
  });
}

function amDesc(mode) {
  return mode === 'end'
    ? 'まとめて採点:連続で解き進めて、最後に全問の答え合わせと解説を表示します。'
    : '一問一答:1問解答するごとに正誤と解説をすぐ表示します。';
}
