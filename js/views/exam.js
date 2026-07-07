// ============================================================
// 模試:プレミアム機能のデモ
//  - 分野バランス型 / 弱点強化型(統計から低正答率の分野を重点出題)
//  - タイマー付き通し解答 → 採点 → 分野別内訳
// ============================================================
import { QUESTIONS, EXAM_INFO, shuffle } from '../data/questions.js';
import { getCategoryStats, recordAnswer, isPremium, setPremium } from '../storage.js';
import { renderBarChart } from '../components/chart.js';

const MARK_CYCLE = ['none', 'maru', 'sankaku', 'batsu'];
const MARK_ICON = { none: '−', maru: '◯', sankaku: '△', batsu: '✕' };

export function renderExam(root) {
  let timerId = null;

  // ============ 1. 設定画面 ============
  function showSetup() {
    stopTimer();
    const premium = isPremium();
    root.innerHTML = `
      <div class="card">
        <h2>模試をつくる <span class="badge badge-premium">✦ プレミアム</span></h2>
        <p class="sub">出題方法と問題数・制限時間を選ぶと、その場で模試を自動作成します。</p>

        <div class="field">
          <span class="flabel">出題方法</span>
          <div class="mode-cards" role="radiogroup" aria-label="出題方法">
            <label class="mode-card active" data-mode="balanced">
              <input type="radio" name="mode" value="balanced" checked>
              <span>
                <span class="mc-t">分野バランス型 <span class="badge badge-free">無料</span></span>
                <span class="mc-d">3分野から均等に出題する標準的な模試です。</span>
              </span>
            </label>
            <label class="mode-card" data-mode="weak">
              <input type="radio" name="mode" value="weak">
              <span>
                <span class="mc-t">弱点強化型 <span class="badge badge-premium">✦ プレミアム</span></span>
                <span class="mc-d">あなたの解答統計から正答率の低い分野を重点的に出題します。${premium ? '' : '(プロトタイプでは無料で体験できます)'}</span>
              </span>
            </label>
          </div>
        </div>

        <div class="field">
          <span class="flabel">問題数</span>
          <div class="seg" data-seg="count">
            <button type="button" data-v="5">5問</button>
            <button type="button" data-v="10" class="active">10問</button>
            <button type="button" data-v="20">20問</button>
          </div>
        </div>

        <div class="field">
          <span class="flabel">制限時間</span>
          <div class="seg" data-seg="time">
            <button type="button" data-v="5">5分</button>
            <button type="button" data-v="10" class="active">10分</button>
            <button type="button" data-v="15">15分</button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="start-exam" type="button">模試を開始する ⏱</button>
      </div>

      <div class="notice">
        ✦ プレミアムは将来の有料機能の想定です。過去問の利用規約で収益化が認められない資格では、この機能も無料で提供します。
      </div>
    `;

    // モードカード
    root.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        root.querySelectorAll('.mode-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        card.querySelector('input').checked = true;
      });
    });

    // セグメント選択
    root.querySelectorAll('.seg').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    root.querySelector('#start-exam').addEventListener('click', () => {
      const mode = root.querySelector('input[name="mode"]:checked').value;
      const count = Number(root.querySelector('[data-seg="count"] .active').dataset.v);
      const minutes = Number(root.querySelector('[data-seg="time"] .active').dataset.v);
      if (mode === 'weak' && !isPremium()) setPremium(true); // デモ:体験開始でフラグON
      startExam(buildExam(mode, count), minutes, mode);
    });
  }

  // ============ 出題の生成 ============
  function buildExam(mode, count) {
    const cats = EXAM_INFO.categories;
    const questionIndex = new Map(QUESTIONS.map((q) => [q.id, q]));

    // 分野ごとの重み(バランス型は均等、弱点型は誤答率ベース)
    let weights;
    if (mode === 'weak') {
      const stats = getCategoryStats(questionIndex);
      weights = cats.map((c) => {
        const s = stats.get(c);
        if (!s || s.total === 0) return 0.5;              // 未学習分野は中間の重み
        return Math.max(0.15, 1 - s.correct / s.total);   // 誤答率(最低保証あり)
      });
    } else {
      weights = cats.map(() => 1);
    }
    const wSum = weights.reduce((a, b) => a + b, 0);

    // 重みに応じて各分野の出題数を配分
    const alloc = weights.map((w) => Math.floor((w / wSum) * count));
    let rest = count - alloc.reduce((a, b) => a + b, 0);
    for (let i = 0; rest > 0; i = (i + 1) % cats.length) {
      alloc[i] += 1; rest -= 1;
    }

    const picked = [];
    cats.forEach((c, i) => {
      const pool = shuffle(QUESTIONS.filter((q) => q.category === c));
      picked.push(...pool.slice(0, alloc[i]));
    });
    // 分野内の問題が足りない場合は全体から補充
    if (picked.length < count) {
      const used = new Set(picked.map((q) => q.id));
      picked.push(...shuffle(QUESTIONS.filter((q) => !used.has(q.id))).slice(0, count - picked.length));
    }
    return shuffle(picked);
  }

  // ============ 2. 受験画面 ============
  function startExam(questions, minutes, mode) {
    let index = 0;
    let remaining = minutes * 60;
    const answers = new Array(questions.length).fill(null);
    const marks = questions.map(() => ({})); // 問題ごとの {選択肢index: マーク}

    root.innerHTML = `
      <div class="quiz-top">
        <span class="qt-count"></span>
        <div class="progress-track"><div class="progress-fill"></div></div>
        <span class="exam-timer" role="timer"></span>
      </div>
      <div class="exam-palette" aria-label="問題一覧"></div>
      <div id="exam-q"></div>
      <div class="action-bar">
        <div class="action-bar-inner">
          <button class="btn" id="prev-q" type="button">← 前へ</button>
          <button class="btn btn-primary btn-lg" id="next-q" type="button" style="flex:1">次へ →</button>
          <button class="btn" id="submit-exam" type="button">採点する</button>
        </div>
      </div>
    `;

    const els = {
      count: root.querySelector('.qt-count'),
      fill: root.querySelector('.progress-fill'),
      timer: root.querySelector('.exam-timer'),
      palette: root.querySelector('.exam-palette'),
      qArea: root.querySelector('#exam-q'),
    };

    function tick() {
      remaining -= 1;
      drawTimer();
      if (remaining <= 0) {
        stopTimer();
        gradeExam(questions, answers, mode, true);
      }
    }

    function drawTimer() {
      const m = Math.floor(Math.max(0, remaining) / 60);
      const s = Math.max(0, remaining) % 60;
      els.timer.textContent = `残り ${m}:${String(s).padStart(2, '0')}`;
      els.timer.classList.toggle('low', remaining <= 60);
    }

    function drawPalette() {
      els.palette.innerHTML = questions.map((_, i) => `
        <button type="button" data-i="${i}"
          class="${answers[i] !== null ? 'answered' : ''} ${i === index ? 'current' : ''}"
          aria-label="問${i + 1}${answers[i] !== null ? '(解答済み)' : ''}">${i + 1}</button>
      `).join('');
    }

    function showQ() {
      const q = questions[index];
      els.count.textContent = `問 ${index + 1} / ${questions.length}`;
      els.fill.style.width = `${((index + 1) / questions.length) * 100}%`;
      drawPalette();

      els.qArea.innerHTML = `
        <div class="q-card">
          <div class="q-meta">
            <span class="badge">${q.category}</span>
            <span class="badge">模試</span>
          </div>
          <p class="q-text">${escapeHtml(q.text)}</p>
        </div>
        <div class="choices">
          ${q.choices.map((text, i) => `
            <div class="choice ${answers[index] === i ? 'is-selected' : ''}" data-index="${i}" data-mark="${marks[index][i] || 'none'}">
              <button class="choice-mark-btn" type="button" aria-label="選択肢${i + 1}のマークを切り替え">${MARK_ICON[marks[index][i] || 'none']}</button>
              <button class="choice-body" type="button">
                <span class="choice-key">${i + 1}</span>
                <span class="choice-text">${escapeHtml(text)}</span>
                <span class="result-icon">${answers[index] === i ? '選択中' : ''}</span>
              </button>
            </div>`).join('')}
        </div>
      `;

      els.qArea.querySelectorAll('.choice').forEach((row) => {
        const i = Number(row.dataset.index);
        row.querySelector('.choice-mark-btn').addEventListener('click', () => {
          const cur = row.dataset.mark;
          const next = MARK_CYCLE[(MARK_CYCLE.indexOf(cur) + 1) % MARK_CYCLE.length];
          row.dataset.mark = next;
          marks[index][i] = next;
          row.querySelector('.choice-mark-btn').textContent = MARK_ICON[next];
        });
        row.querySelector('.choice-body').addEventListener('click', () => {
          answers[index] = i;
          // 解答したら少し間を置いて自動で次の問題へ(模試でもテンポよく)
          if (index < questions.length - 1) {
            setTimeout(() => { index += 1; showQ(); }, 220);
          } else {
            showQ();
          }
        });
      });
    }

    els.palette.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-i]');
      if (!btn) return;
      index = Number(btn.dataset.i);
      showQ();
    });
    root.querySelector('#prev-q').addEventListener('click', () => {
      if (index > 0) { index -= 1; showQ(); }
    });
    root.querySelector('#next-q').addEventListener('click', () => {
      if (index < questions.length - 1) { index += 1; showQ(); }
    });
    root.querySelector('#submit-exam').addEventListener('click', () => {
      const unanswered = answers.filter((a) => a === null).length;
      if (unanswered > 0 && !confirm(`未解答が ${unanswered} 問あります。採点しますか?`)) return;
      stopTimer();
      gradeExam(questions, answers, mode, false);
    });

    drawTimer();
    timerId = setInterval(tick, 1000);
    showQ();
  }

  // ============ 3. 結果画面 ============
  function gradeExam(questions, answers, mode, timeUp) {
    stopTimer();
    let correct = 0;
    const byCat = new Map();
    const wrong = [];

    questions.forEach((q, i) => {
      const ok = answers[i] === q.answer;
      if (ok) correct += 1;
      else wrong.push({ q, picked: answers[i] });
      recordAnswer(q.id, ok, 'exam');
      const s = byCat.get(q.category) || { total: 0, correct: 0 };
      s.total += 1;
      if (ok) s.correct += 1;
      byCat.set(q.category, s);
    });

    const rate = Math.round((correct / questions.length) * 100);
    const rows = [...byCat.entries()].map(([label, s]) => ({
      label,
      value: Math.round((s.correct / s.total) * 100),
      detail: `${s.correct}/${s.total} 問正解`,
    }));

    root.innerHTML = `
      <div class="card result-hero">
        ${timeUp ? '<p class="sub">⏰ 時間切れのため自動採点しました</p>' : ''}
        <div class="rh-num">${correct}<small> / ${questions.length} 問正解(${rate}%)</small></div>
        <div class="rh-label">${mode === 'weak' ? '弱点強化型' : '分野バランス型'}模試の結果</div>
      </div>

      <div class="card">
        <h2>分野別の内訳</h2>
        <p class="sub">今回の模試での正答率</p>
        <div id="exam-chart"></div>
      </div>

      ${wrong.length ? `
      <div class="card">
        <h2>間違えた問題(${wrong.length}問)</h2>
        <div class="review-list" style="margin-top:10px">
          ${wrong.map(({ q, picked }) => `
            <div class="review-item" style="flex-direction:column; align-items:stretch; white-space:normal">
              <div style="font-weight:600">${escapeHtml(q.text)}</div>
              <div style="font-size:12.5px; margin-top:4px">
                <span style="color:var(--ng)">あなた: ${picked === null ? '未解答' : escapeHtml(q.choices[picked])}</span><br>
                <span style="color:var(--ok)">正解: ${escapeHtml(q.choices[q.answer])}</span>
              </div>
              <div style="font-size:12.5px; color:var(--ink-2); margin-top:4px">${escapeHtml(q.explanation)}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="ad-slot" aria-hidden="true">
        <strong>広告スペース</strong>
        結果の確認が終わった位置にのみ表示します。
      </div>

      <div style="display:flex; flex-direction:column; gap:10px">
        <button class="btn btn-lg" id="retry-exam" type="button">⏱ もう一度模試をつくる</button>
        <a class="btn btn-primary btn-lg" href="#/">ホームへ戻る</a>
      </div>
    `;

    renderBarChart(root.querySelector('#exam-chart'), rows);
    root.querySelector('#retry-exam').addEventListener('click', showSetup);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  showSetup();
  return () => stopTimer();
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
