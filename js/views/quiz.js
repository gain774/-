// ============================================================
// 演習画面:カコモン+ のコア体験
//  - 選択肢の ⚪︎/△/× マークで択を絞り込める
//  - ワンタップ解答 → 解説 → 大きな「次へ」ボタン(Enter でも進む)
//  - 自動で次へ(設定)
//  - ペン/マーカーで問題に書き込み
//  - 広告は解説の下だけ(操作ボタンに隣接させない)
// ============================================================
import { QUESTIONS, getQuestionById, shuffle } from '../data/questions.js';
import {
  getSettings, recordAnswer, saveResume, clearResume, getResume, getLatestResults,
} from '../storage.js';
import { attachDrawing } from '../components/drawing.js';

const MARK_CYCLE = ['none', 'maru', 'sankaku', 'batsu'];
const MARK_ICON = { none: '−', maru: '◯', sankaku: '△', batsu: '✕' };
const MARK_LABEL = { none: 'マークなし', maru: '有力', sankaku: '保留', batsu: '除外' };

export function renderQuiz(root, params) {
  const mode = params.get('mode') || 'all';
  const cat = params.get('cat') || '';

  // ---------------- 出題リストの構築 ----------------
  let qids;
  let label;
  if (mode === 'resume') {
    const r = getResume();
    if (!r) { location.hash = '#/'; return; }
    qids = r.qids;
    label = r.label;
  } else if (mode === 'wrong') {
    const latest = getLatestResults();
    qids = shuffle(QUESTIONS.filter((q) => latest.get(q.id)?.correct === false).map((q) => q.id));
    label = '間違えた問題の復習';
  } else if (cat) {
    qids = shuffle(QUESTIONS.filter((q) => q.category === cat).map((q) => q.id));
    label = cat;
  } else {
    qids = shuffle(QUESTIONS.map((q) => q.id));
    label = '全問シャッフル';
  }

  if (qids.length === 0) {
    root.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>出題できる問題がありません</h2>
        <p class="sub">このモードに該当する問題がまだありません。</p>
        <a class="btn btn-primary" href="#/">ホームへ戻る</a>
      </div>`;
    return;
  }

  // ---------------- セッション状態 ----------------
  const session = {
    index: mode === 'resume' ? (getResume()?.index ?? 0) : 0,
    correct: mode === 'resume' ? (getResume()?.correct ?? 0) : 0,
    wrong: mode === 'resume' ? (getResume()?.wrong ?? 0) : 0,
    wrongIds: mode === 'resume' ? (getResume()?.wrongIds ?? []) : [],
  };

  let answered = false;
  let drawingApi = null;
  let autoTimer = null;
  const settings = getSettings();

  // ---------------- 画面骨格 ----------------
  root.innerHTML = `
    <div class="quiz-top">
      <span class="qt-count"></span>
      <div class="progress-track"><div class="progress-fill"></div></div>
      <span class="quiz-score"><span class="ok"></span> / <span class="ng"></span></span>
    </div>
    <div class="draw-toolbar" role="toolbar" aria-label="書き込みツール"></div>
    <div id="q-area"></div>
    <div class="action-bar" hidden>
      <div class="action-bar-inner">
        <span class="kbd-hint"><kbd>Enter</kbd> で次へ</span>
        <button class="btn btn-primary btn-lg btn-next" type="button">
          <span class="auto-fill"></span>
          <span class="btn-next-label">次の問題へ →</span>
        </button>
      </div>
    </div>
  `;

  const els = {
    count: root.querySelector('.qt-count'),
    fill: root.querySelector('.progress-fill'),
    ok: root.querySelector('.quiz-score .ok'),
    ng: root.querySelector('.quiz-score .ng'),
    toolbar: root.querySelector('.draw-toolbar'),
    qArea: root.querySelector('#q-area'),
    actionBar: root.querySelector('.action-bar'),
    nextBtn: root.querySelector('.btn-next'),
    nextLabel: root.querySelector('.btn-next-label'),
  };

  // ---------------- 書き込みツールバー ----------------
  els.toolbar.innerHTML = `
    <span class="tool-label">書き込み:</span>
    <button class="tool-btn" data-draw-toggle type="button" aria-pressed="false">✎ オフ</button>
    <button class="tool-btn" data-tool="pen" type="button" title="赤ペン">🖊 赤</button>
    <button class="tool-btn" data-tool="penBlue" type="button" title="青ペン">🖊 青</button>
    <button class="tool-btn" data-tool="marker" type="button" title="蛍光マーカー">🖍 蛍光</button>
    <button class="tool-btn" data-tool="eraser" type="button" title="消しゴム">◻ 消す</button>
    <button class="tool-btn" data-draw-clear type="button" title="すべて消す">🗑 全消去</button>
  `;
  const toggleBtn = els.toolbar.querySelector('[data-draw-toggle]');

  function syncToolbar() {
    const on = drawingApi?.isActive() ?? false;
    toggleBtn.classList.toggle('active', on);
    toggleBtn.setAttribute('aria-pressed', String(on));
    toggleBtn.textContent = on ? '✎ 書き込み中' : '✎ オフ';
    els.toolbar.querySelectorAll('[data-tool]').forEach((b) => {
      b.classList.toggle('active', on && drawingApi?.getTool() === b.dataset.tool);
    });
  }

  els.toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !drawingApi) return;
    if (btn.hasAttribute('data-draw-toggle')) {
      drawingApi.setActive(!drawingApi.isActive());
    } else if (btn.hasAttribute('data-draw-clear')) {
      drawingApi.clear();
    } else if (btn.dataset.tool) {
      drawingApi.setActive(true);
      drawingApi.setTool(btn.dataset.tool);
    }
    syncToolbar();
  });

  // ---------------- 出題 ----------------
  function currentQuestion() {
    return getQuestionById(qids[session.index]);
  }

  function updateTop() {
    els.count.textContent = `問 ${session.index + 1} / ${qids.length}`;
    els.fill.style.width = `${(session.index / qids.length) * 100}%`;
    els.ok.textContent = `◯${session.correct}`;
    els.ng.textContent = `✕${session.wrong}`;
  }

  function showQuestion() {
    cancelAuto();
    answered = false;
    els.actionBar.hidden = true;
    updateTop();

    const q = currentQuestion();
    drawingApi?.destroy();

    els.qArea.innerHTML = `
      <div class="q-card fade-in">
        <div class="q-meta">
          <span class="badge">${q.category}</span>
          <span class="badge">${q.year}年 サンプル</span>
          <span class="badge">${label}</span>
        </div>
        <p class="q-text">${escapeHtml(q.text)}</p>
      </div>
      <p class="mark-hint">左の「−」をタップすると ◯(有力)→ △(保留)→ ✕(除外)の順にマークが付きます。✕ は薄く打ち消し表示になり、択を絞れます。</p>
      <div class="choices"></div>
      <div id="after-answer"></div>
    `;

    const qCard = els.qArea.querySelector('.q-card');
    drawingApi = attachDrawing(qCard);
    syncToolbar();

    const choicesEl = els.qArea.querySelector('.choices');
    q.choices.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'choice';
      row.dataset.mark = 'none';
      row.dataset.index = String(i);
      row.innerHTML = `
        <button class="choice-mark-btn" type="button"
          aria-label="選択肢${i + 1}のマークを切り替え">${MARK_ICON.none}</button>
        <button class="choice-body" type="button">
          <span class="choice-key">${i + 1}</span>
          <span class="choice-text">${escapeHtml(text)}</span>
          <span class="result-icon"></span>
        </button>
      `;
      row.querySelector('.choice-mark-btn').addEventListener('click', () => cycleMark(row));
      row.querySelector('.choice-body').addEventListener('click', () => answer(i));
      choicesEl.appendChild(row);
    });
  }

  function cycleMark(row) {
    if (answered) return;
    const cur = row.dataset.mark;
    const next = MARK_CYCLE[(MARK_CYCLE.indexOf(cur) + 1) % MARK_CYCLE.length];
    row.dataset.mark = next;
    const btn = row.querySelector('.choice-mark-btn');
    btn.textContent = MARK_ICON[next];
    btn.setAttribute('aria-label', `選択肢${Number(row.dataset.index) + 1}: ${MARK_LABEL[next]}`);
  }

  // ---------------- 解答 ----------------
  function answer(picked) {
    if (answered) return;
    answered = true;

    const q = currentQuestion();
    const isCorrect = picked === q.answer;
    if (isCorrect) session.correct += 1;
    else { session.wrong += 1; session.wrongIds.push(q.id); }

    recordAnswer(q.id, isCorrect, 'practice');
    saveResume({
      qids, index: session.index + 1,
      correct: session.correct, wrong: session.wrong,
      wrongIds: session.wrongIds, label,
    });

    // 選択肢をロックして正誤を可視化
    els.qArea.querySelectorAll('.choice').forEach((row) => {
      const i = Number(row.dataset.index);
      row.classList.add('locked');
      if (i === q.answer) {
        row.classList.add('is-correct');
        row.querySelector('.result-icon').textContent = '正解';
      } else if (i === picked) {
        row.classList.add('is-wrong-pick');
        row.querySelector('.result-icon').textContent = 'あなたの解答';
      }
    });

    // 判定 + 解説 +(その下に)広告スペース
    const after = els.qArea.querySelector('#after-answer');
    const autoOn = settings.autoAdvance;
    after.innerHTML = `
      <div class="verdict ${isCorrect ? 'ok' : 'ng'}" role="status">
        <span>${isCorrect ? '◯ 正解!' : '✕ 不正解'}</span>
        ${autoOn ? `<span class="auto-note">${settings.autoAdvanceDelay}秒後に自動で次へ(タップでキャンセル)</span>` : ''}
      </div>
      <div class="explain-card">
        <h3>解説</h3>
        <p>${escapeHtml(q.explanation)}</p>
      </div>
      <div class="ad-slot" aria-hidden="true">
        <strong>広告スペース</strong>
        解説の下だけに表示。選択肢や「次へ」ボタンには隣接させず、誤タップを防ぐ設計です。
      </div>
    `;

    els.actionBar.hidden = false;
    if (session.index + 1 >= qids.length) {
      els.nextLabel.textContent = '結果を見る →';
    }

    if (autoOn) startAuto(after.querySelector('.verdict'));
    updateTop();
  }

  function startAuto(verdictEl) {
    const sec = Math.max(1, Number(settings.autoAdvanceDelay) || 3);
    els.nextBtn.classList.add('auto-running');
    els.nextBtn.querySelector('.auto-fill').style.animationDuration = `${sec}s`;
    autoTimer = setTimeout(next, sec * 1000);
    verdictEl?.addEventListener('click', cancelAuto, { once: true });
  }

  function cancelAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    els.nextBtn.classList.remove('auto-running');
    const note = els.qArea.querySelector('.auto-note');
    if (note) note.textContent = '';
  }

  function next() {
    cancelAuto();
    session.index += 1;
    if (session.index >= qids.length) {
      finish();
    } else {
      showQuestion();
      window.scrollTo({ top: 0 });
    }
  }

  // ---------------- 結果 ----------------
  function finish() {
    clearResume();
    drawingApi?.destroy();
    drawingApi = null;
    els.actionBar.hidden = true;
    els.toolbar.hidden = true;
    els.fill.style.width = '100%';

    const total = qids.length;
    const rate = Math.round((session.correct / total) * 100);
    els.qArea.innerHTML = `
      <div class="card result-hero fade-in">
        <div class="rh-num">${session.correct}<small> / ${total} 問正解(${rate}%)</small></div>
        <div class="rh-label">${escapeHtml(label)} おつかれさまでした!</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px">
        ${session.wrongIds.length ? `<a class="btn btn-lg" href="#/quiz?mode=wrong">✕ 間違えた問題だけもう一度(${session.wrongIds.length}問)</a>` : ''}
        <a class="btn btn-lg" href="#/stats">📊 統計を見る</a>
        <a class="btn btn-primary btn-lg" href="#/">ホームへ戻る</a>
      </div>
    `;
  }

  // ---------------- キーボード ----------------
  function onKey(e) {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key >= '1' && e.key <= '4') {
      const i = Number(e.key) - 1;
      const q = currentQuestion();
      if (q && i < q.choices.length && !answered) answer(i);
    } else if (e.key === 'Enter' && answered) {
      e.preventDefault();
      next();
    } else if (e.key === 'Escape') {
      cancelAuto();
    }
  }

  els.nextBtn.addEventListener('click', next);
  document.addEventListener('keydown', onKey);

  showQuestion();

  // ビュー破棄時の後始末
  return () => {
    document.removeEventListener('keydown', onKey);
    cancelAuto();
    drawingApi?.destroy();
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
