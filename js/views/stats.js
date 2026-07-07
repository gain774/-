// ============================================================
// 統計ダッシュボード:スタットタイル + 分野別正答率 + 復習リスト
// ============================================================
import { QUESTIONS, EXAM_INFO } from '../data/questions.js';
import { getSummary, getCategoryStats, getLatestResults, getHistory } from '../storage.js';
import { escapeHtml } from '../utils.js';
import { renderBarChart } from '../components/chart.js';

export function renderStats(root) {
  const summary = getSummary();
  const questionIndex = new Map(QUESTIONS.map((q) => [q.id, q]));
  const catStats = getCategoryStats(questionIndex);
  const latest = getLatestResults();

  const rows = EXAM_INFO.categories
    .map((c) => {
      const s = catStats.get(c);
      if (!s || s.total === 0) return null;
      return {
        label: c,
        value: Math.round((s.correct / s.total) * 100),
        detail: `${s.correct}/${s.total} 問正解`,
        raw: s,
      };
    })
    .filter(Boolean);

  const wrongQs = QUESTIONS.filter((q) => latest.get(q.id)?.correct === false);

  root.innerHTML = `
    <div class="stat-tiles">
      <div class="stat-tile">
        <div class="st-label">総解答数</div>
        <div class="st-value">${summary.total}<small> 問</small></div>
      </div>
      <div class="stat-tile">
        <div class="st-label">正答率</div>
        <div class="st-value">${summary.total ? Math.round(summary.accuracy * 100) : '—'}<small>${summary.total ? ' %' : ''}</small></div>
      </div>
      <div class="stat-tile">
        <div class="st-label">連続学習</div>
        <div class="st-value">${summary.streak}<small> 日</small></div>
      </div>
    </div>

    <div class="card">
      <h2>分野別 正答率</h2>
      <p class="sub">これまでの全解答から集計(演習・模試を含む)</p>
      <div id="cat-chart"></div>
      ${rows.length ? '<button class="table-toggle" type="button" aria-expanded="false">表で見る</button><div id="cat-table" hidden></div>' : ''}
    </div>

    <div class="card">
      <h2>復習が必要な問題</h2>
      <p class="sub">最後に解いたとき間違えた問題(${wrongQs.length}件)</p>
      ${wrongQs.length ? `
        <div class="review-list">
          ${wrongQs.slice(0, 10).map((q) => `
            <div class="review-item">
              <span class="badge">${q.category}</span>
              <span class="ri-text">${escapeHtml(q.text)}</span>
            </div>`).join('')}
          ${wrongQs.length > 10 ? `<p class="sub" style="margin:6px 0 0">ほか ${wrongQs.length - 10} 件</p>` : ''}
        </div>
        <div style="margin-top:14px">
          <a class="btn btn-primary btn-lg" href="#/quiz?mode=wrong">間違えた問題をまとめて復習する</a>
        </div>
      ` : '<p class="sub" style="margin:0">現在、復習対象はありません。</p>'}
    </div>
  `;

  renderBarChart(root.querySelector('#cat-chart'), rows);

  // アクセシビリティ用のデータテーブル表示
  const toggle = root.querySelector('.table-toggle');
  if (toggle) {
    const tableWrap = root.querySelector('#cat-table');
    tableWrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th scope="col">分野</th><th scope="col" style="text-align:right">正答率</th><th scope="col" style="text-align:right">正解 / 解答数</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td>${r.label}</td><td class="num">${r.value}%</td><td class="num">${r.raw.correct} / ${r.raw.total}</td></tr>`).join('')}
        </tbody>
      </table>`;
    toggle.addEventListener('click', () => {
      const open = tableWrap.hidden;
      tableWrap.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '表を閉じる' : '表で見る';
    });
  }
}
