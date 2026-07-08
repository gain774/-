// ============================================================
// 演習設定:これから解く問題の条件を選んでから開始する
//   年度(複数選択)/ 区分(午前・午後)/ 分野 / 出題順 /
//   解答方式(一問一答・まとめて採点)/ 問題数
// 例: 過去5年分の午前の問題を、年度バラバラのランダム順で一問一答
// ============================================================
import { getActiveExam } from '../data/questions.js';
import { getSettings, getPracticeConfig, savePracticeConfig, updateSettings } from '../storage.js';
import { escapeHtml } from '../utils.js';

export function renderPractice(root) {
  const exam = getActiveExam();
  const questions = exam.questions;

  const years = [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a);
  const parts = [...new Set(questions.map((q) => q.part).filter(Boolean))];
  const cats = exam.categories;

  const saved = getPracticeConfig() || {};
  const settings = getSettings();
  const sel = {
    years: new Set((saved.years || years).filter((y) => years.includes(y))),
    part: parts.includes(saved.part) ? saved.part : 'all',
    cats: new Set((saved.cats || cats).filter((c) => cats.includes(c))),
    order: saved.order === 'year' ? 'year' : 'random',
    answerMode: saved.answerMode || settings.answerMode,
    count: [0, 10, 20, 50].includes(saved.count) ? saved.count : 0,
  };
  if (sel.years.size === 0) years.forEach((y) => sel.years.add(y));
  if (sel.cats.size === 0) cats.forEach((c) => sel.cats.add(c));

  root.innerHTML = `
    <div class="card">
      <h2>演習をはじめる</h2>
      <p class="sub">${escapeHtml(exam.name)} — これから解く問題の条件を選んでください</p>

      <div class="field">
        <span class="flabel">年度 <button class="table-toggle" id="years-all" type="button">すべて選択/解除</button></span>
        <div class="chip-group" id="years-group">
          ${years.map((y) => `<button type="button" class="chip ${sel.years.has(y) ? 'active' : ''}" data-year="${y}">${y}年度</button>`).join('')}
        </div>
      </div>

      ${parts.length ? `
      <div class="field">
        <span class="flabel">区分</span>
        <div class="seg" id="part-seg">
          <button type="button" data-part="all" class="${sel.part === 'all' ? 'active' : ''}">すべて</button>
          ${parts.map((p) => `<button type="button" data-part="${escapeHtml(p)}" class="${sel.part === p ? 'active' : ''}">${escapeHtml(p)}</button>`).join('')}
        </div>
      </div>` : ''}

      <div class="field">
        <span class="flabel">分野 <button class="table-toggle" id="cats-all" type="button">すべて選択/解除</button></span>
        <div class="chip-group" id="cats-group">
          ${cats.map((c) => `<button type="button" class="chip ${sel.cats.has(c) ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <span class="flabel">出題順</span>
        <div class="seg" id="order-seg">
          <button type="button" data-order="random" class="${sel.order === 'random' ? 'active' : ''}">ランダム(年度バラバラ)</button>
          <button type="button" data-order="year" class="${sel.order === 'year' ? 'active' : ''}">年度順</button>
        </div>
      </div>

      <div class="field">
        <span class="flabel">解答方式</span>
        <div class="seg" id="am-seg">
          <button type="button" data-amode="each" class="${sel.answerMode === 'each' ? 'active' : ''}">一問一答(すぐ採点)</button>
          <button type="button" data-amode="end" class="${sel.answerMode === 'end' ? 'active' : ''}">連続解答(最後に採点)</button>
        </div>
      </div>

      <div class="field">
        <span class="flabel">問題数</span>
        <div class="seg" id="count-seg">
          <button type="button" data-count="0" class="${sel.count === 0 ? 'active' : ''}">すべて</button>
          <button type="button" data-count="10" class="${sel.count === 10 ? 'active' : ''}">10問</button>
          <button type="button" data-count="20" class="${sel.count === 20 ? 'active' : ''}">20問</button>
          <button type="button" data-count="50" class="${sel.count === 50 ? 'active' : ''}">50問</button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="start-practice" type="button"></button>
      <p class="sub" id="practice-status" role="status" style="margin:10px 0 0"></p>
    </div>
  `;

  const startBtn = root.querySelector('#start-practice');

  function matched() {
    return questions.filter((q) =>
      sel.years.has(q.year)
      && (sel.part === 'all' || (q.part || '') === sel.part)
      && sel.cats.has(q.category));
  }

  function updateStart() {
    const n = matched().length;
    const shown = sel.count && sel.count < n ? sel.count : n;
    startBtn.textContent = n === 0 ? '該当する問題がありません' : `この条件で開始(${shown}問)`;
    startBtn.disabled = n === 0;
  }

  // 年度・分野チップ
  root.querySelector('#years-group').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-year]');
    if (!chip) return;
    const y = Number(chip.dataset.year);
    sel.years.has(y) ? sel.years.delete(y) : sel.years.add(y);
    chip.classList.toggle('active');
    updateStart();
  });
  root.querySelector('#cats-group').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    const c = chip.dataset.cat;
    sel.cats.has(c) ? sel.cats.delete(c) : sel.cats.add(c);
    chip.classList.toggle('active');
    updateStart();
  });
  root.querySelector('#years-all').addEventListener('click', () => {
    const all = sel.years.size === years.length;
    sel.years.clear();
    if (!all) years.forEach((y) => sel.years.add(y));
    root.querySelectorAll('[data-year]').forEach((c) => c.classList.toggle('active', !all));
    updateStart();
  });
  root.querySelector('#cats-all').addEventListener('click', () => {
    const all = sel.cats.size === cats.length;
    sel.cats.clear();
    if (!all) cats.forEach((c) => sel.cats.add(c));
    root.querySelectorAll('[data-cat]').forEach((c) => c.classList.toggle('active', !all));
    updateStart();
  });

  // セグメント類
  function segHandler(segId, dataKey, apply) {
    const seg = root.querySelector(segId);
    if (!seg) return;
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest(`[data-${dataKey}]`);
      if (!btn) return;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      apply(btn.dataset[dataKey === 'amode' ? 'amode' : dataKey]);
      updateStart();
    });
  }
  segHandler('#part-seg', 'part', (v) => { sel.part = v; });
  segHandler('#order-seg', 'order', (v) => { sel.order = v; });
  segHandler('#am-seg', 'amode', (v) => { sel.answerMode = v; });
  segHandler('#count-seg', 'count', (v) => { sel.count = Number(v); });

  startBtn.addEventListener('click', () => {
    const config = {
      years: [...sel.years],
      part: sel.part,
      cats: [...sel.cats],
      order: sel.order,
      answerMode: sel.answerMode,
      count: sel.count,
    };
    savePracticeConfig(config);
    updateSettings({ answerMode: sel.answerMode }); // 全体の既定も揃える
    location.hash = '#/quiz?mode=custom';
  });

  updateStart();
}
