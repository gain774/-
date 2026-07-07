// ============================================================
// 問題データの管理:資格データの一覧と JSON 取り込み
// 実際の過去問は各資格団体の著作権・利用規約の確認が前提。
// 取り込んだデータはこの端末のブラウザ内(localStorage)に保存される。
// ============================================================
import { getAllExams } from '../data/questions.js';
import { getImportedExams, addImportedExam, removeImportedExam, updateSettings } from '../storage.js';
import { escapeHtml } from '../utils.js';

const SAMPLE_JSON = `{
  "id": "kenchiku1-r6",
  "name": "1級建築施工管理技士 令和6年(自分用)",
  "description": "権利確認済みの取り込みデータ",
  "categories": ["建築学", "躯体施工", "仕上施工", "施工管理法", "法規"],
  "questions": [
    {
      "id": "r6-001",
      "year": 2024,
      "category": "建築学",
      "text": "問題文をここに入力…",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answer": 2,
      "explanation": "解説をここに入力…(answer は 0 始まりの正解番号)"
    }
  ]
}`;

export function renderImport(root) {
  function draw() {
    const imported = getImportedExams();
    const importedIds = new Set(imported.map((e) => e.id));

    root.innerHTML = `
      <div class="card">
        <h2>問題データの管理</h2>
        <p class="sub">収録中の資格データの一覧と、新しい問題データの取り込み</p>
        <div class="review-list">
          ${getAllExams().map((e) => `
            <div class="review-item">
              <span class="badge">${importedIds.has(e.id) ? '取り込み' : '内蔵'}</span>
              <span class="ri-text">${escapeHtml(e.name)}</span>
              <span class="cs" style="color:var(--muted); font-size:12px">${e.questions.length}問</span>
              ${importedIds.has(e.id) ? `<button class="btn" data-del="${escapeHtml(e.id)}" type="button" style="color:var(--ng); border-color:var(--ng)">削除</button>` : ''}
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <h2>JSON から取り込む</h2>
        <p class="sub">下の形式の JSON を貼り付けて取り込みます。データはこの端末のブラウザ内に保存されます。</p>

        <div class="field">
          <textarea class="textarea" id="import-json" style="min-height:180px; font-family:ui-monospace, monospace; font-size:12.5px" placeholder='${escapeHtml(SAMPLE_JSON)}'></textarea>
        </div>

        <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin-bottom:14px; cursor:pointer">
          <input type="checkbox" id="rights-check" style="margin-top:3px; accent-color:var(--accent)">
          <span>この問題データについて、資格団体の著作権・利用規約を確認し、利用する権利があることを確認しました(実際の過去問は無断転載になる場合があります)。</span>
        </label>

        <div style="display:flex; flex-direction:column; gap:10px">
          <button class="btn btn-primary btn-lg" id="do-import" type="button">取り込む</button>
          <button class="btn" id="fill-template" type="button">入力欄にテンプレートを挿入</button>
        </div>
        <p class="sub" id="import-status" role="status" style="margin:10px 0 0"></p>
      </div>

      <div class="notice">
        <strong>1級建築施工管理技士の実際の過去問について</strong><br>
        試験問題は試験実施団体(建設業振興基金)の著作物のため、このアプリには収録していません。
        本アプリ収録の問題は出題形式・分野に合わせたオリジナル問題です。
        実際の過去問を使いたい場合は、団体の利用条件を確認のうえ、この画面から自分用データとして取り込んでください。
      </div>
    `;

    const statusEl = root.querySelector('#import-status');

    root.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('この資格データを削除しますか?(解答履歴は残ります)')) return;
        removeImportedExam(btn.dataset.del);
        draw();
      });
    });

    root.querySelector('#fill-template').addEventListener('click', () => {
      root.querySelector('#import-json').value = SAMPLE_JSON;
    });

    root.querySelector('#do-import').addEventListener('click', () => {
      if (!root.querySelector('#rights-check').checked) {
        statusEl.textContent = '取り込む前に、権利確認のチェックを入れてください。';
        return;
      }
      const raw = root.querySelector('#import-json').value.trim();
      if (!raw) {
        statusEl.textContent = 'JSON を貼り付けてください。';
        return;
      }
      try {
        const exam = normalizeExam(JSON.parse(raw));
        addImportedExam(exam);
        updateSettings({ examId: exam.id });
        draw(); // 一覧を更新(再描画後の要素にメッセージを表示する)
        root.querySelector('#import-status').textContent =
          `「${exam.name}」(${exam.questions.length}問)を取り込み、選択中の資格に設定しました。`;
      } catch (err) {
        statusEl.textContent = `取り込めませんでした: ${err.message}`;
      }
    });
  }

  draw();
}

// 取り込みデータの検証と補完
function normalizeExam(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('JSON のルートはオブジェクトにしてください。');
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('name(資格名)は必須です。');
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('questions(問題の配列)を1問以上入れてください。');
  }

  const examId = String(data.id || `imported-${Date.now()}`);
  const questions = data.questions.map((q, i) => {
    const where = `questions[${i}]`;
    if (!q || typeof q.text !== 'string' || !q.text.trim()) {
      throw new Error(`${where}: text(問題文)は必須です。`);
    }
    if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) {
      throw new Error(`${where}: choices は2〜6個の配列にしてください。`);
    }
    const answer = Number(q.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= q.choices.length) {
      throw new Error(`${where}: answer は 0〜${q.choices.length - 1} の整数(正解の番号)にしてください。`);
    }
    return {
      id: String(q.id || `${examId}-q${i + 1}`),
      year: Number(q.year) || new Date().getFullYear(),
      category: String(q.category || 'その他'),
      text: String(q.text),
      choices: q.choices.map(String),
      answer,
      explanation: String(q.explanation || ''),
    };
  });

  const categories = Array.isArray(data.categories) && data.categories.length
    ? data.categories.map(String)
    : [...new Set(questions.map((q) => q.category))];

  return {
    id: examId,
    name: String(data.name),
    description: String(data.description || '取り込んだ問題データ'),
    categories,
    questions,
  };
}
