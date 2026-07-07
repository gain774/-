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
    // 再描画しても入力途中の内容を失わないように退避
    const keep = {};
    for (const id of ['import-json', 'conv-text', 'conv-name', 'conv-year', 'conv-cat']) {
      const el = root.querySelector(`#${id}`);
      if (el) keep[id] = el.value;
    }

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
              ${importedIds.has(e.id) ? `
                <button class="btn" data-export="${escapeHtml(e.id)}" type="button">書き出し</button>
                <button class="btn" data-del="${escapeHtml(e.id)}" type="button" style="color:var(--ng); border-color:var(--ng)">削除</button>` : ''}
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <h2>テキストから変換(過去問PDFの貼り付け用)</h2>
        <p class="sub">公式サイトの過去問PDFなどから本文をコピーして貼り付けると、下の JSON に自動変換します。変換結果を確認してから取り込んでください。</p>

        <div class="field">
          <label for="conv-name">資格データ名</label>
          <input class="select" id="conv-name" type="text" style="width:100%"
            value="1級建築施工管理技士 過去問(自分用)">
        </div>
        <div class="field" style="display:flex; gap:10px">
          <label style="flex:1">年度(数字)<input class="select" id="conv-year" type="number" value="2024" style="width:100%"></label>
          <label style="flex:1">既定の分野<input class="select" id="conv-cat" type="text" value="未分類" style="width:100%"></label>
        </div>
        <div class="field">
          <textarea class="textarea" id="conv-text" style="min-height:160px; font-size:13px" placeholder="問題ごとに空行で区切って貼り付けます。例:

〔問題1〕 木材に関する記述として、最も不適当なものはどれか。
1. 選択肢のテキスト
2. 選択肢のテキスト
3. 選択肢のテキスト
4. 選択肢のテキスト
正解 3
解説: 任意で解説を書けます
分野: 建築学"></textarea>
        </div>
        <button class="btn btn-lg" id="do-convert" type="button">JSON に変換して下の入力欄へ</button>
        <p class="sub" id="convert-status" role="status" style="margin:10px 0 0"></p>
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

    for (const [id, value] of Object.entries(keep)) {
      const el = root.querySelector(`#${id}`);
      if (el && value !== undefined) el.value = value;
    }

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

    // 書き出し:JSON を下の入力欄に表示 + 可能ならコピー
    // (別の端末ではその JSON を貼り付けて「取り込む」だけで同じデータが使える)
    root.querySelectorAll('[data-export]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const exam = getImportedExams().find((e) => e.id === btn.dataset.export);
        if (!exam) return;
        const json = JSON.stringify(exam, null, 2);
        const area = root.querySelector('#import-json');
        area.value = json;
        let msg = `「${exam.name}」を下の入力欄に書き出しました。`;
        try {
          await navigator.clipboard.writeText(json);
          msg += ' クリップボードにもコピー済みです。';
        } catch {
          msg += ' 全選択してコピーし、別の端末で貼り付けて取り込んでください。';
        }
        statusEl.textContent = msg;
        area.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // テキスト → JSON 変換
    root.querySelector('#do-convert').addEventListener('click', () => {
      const convStatus = root.querySelector('#convert-status');
      const text = root.querySelector('#conv-text').value;
      const defaults = {
        year: Number(root.querySelector('#conv-year').value) || new Date().getFullYear(),
        category: root.querySelector('#conv-cat').value.trim() || '未分類',
      };
      const { questions, warnings } = parseQuestionsText(text, defaults);
      if (questions.length === 0) {
        convStatus.textContent = warnings.length
          ? `変換できませんでした: ${warnings[0]}`
          : '問題を認識できませんでした。問題ごとに空行で区切り、選択肢は「1.」〜の行にしてください。';
        return;
      }
      const name = root.querySelector('#conv-name').value.trim() || '取り込んだ過去問';
      const exam = {
        id: `imported-${Date.now()}`,
        name,
        description: 'テキスト変換で取り込んだ問題データ',
        categories: [...new Set(questions.map((q) => q.category))],
        questions,
      };
      root.querySelector('#import-json').value = JSON.stringify(exam, null, 2);
      convStatus.textContent = `${questions.length}問を変換しました。`
        + (warnings.length ? ` 注意: ${warnings.join(' / ')}` : '')
        + ' 内容を確認し、下の「取り込む」を押してください。';
      root.querySelector('#import-json').scrollIntoView({ behavior: 'smooth', block: 'center' });
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

// 貼り付けテキストを問題データに変換する簡易パーサ
//  - 問題は空行(1行以上)で区切る
//  - 選択肢は「1.」「1)」「(1)」「①」等で始まる行(全角数字可)
//  - 「正解 3」「答え: 3」の行で正解を指定(選択肢番号は1始まり)
//  - 「解説:」「分野:」「年度:」の行は各項目として扱う
export function parseQuestionsText(text, defaults = {}) {
  const warnings = [];
  const questions = [];
  const blocks = String(text).replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);

  const CIRCLED = '①②③④⑤⑥';
  const choiceRe = /^\s*(?:([1-6１-６])\s*[.．)）、:：]|\(([1-6１-６])\)|([①-⑥]))\s*(.+)$/;
  const answerRe = /^\s*(?:正\s*解|答え?|解答)\s*[:：]?\s*(?:([1-6１-６])|([①-⑥]))\s*$/;

  const toNum = (d, circled) => {
    if (circled) return CIRCLED.indexOf(circled) + 1;
    return Number(String(d).replace(/[１-６]/g, (c) => '123456'['１２３４５６'.indexOf(c)]));
  };

  blocks.forEach((block, bi) => {
    const lines = block.split('\n');
    const textLines = [];
    const choices = [];
    let answer = null;
    let explanation = '';
    let category = defaults.category || '未分類';
    let year = defaults.year || new Date().getFullYear();
    let inExplanation = false;

    for (const line of lines) {
      const ans = line.match(answerRe);
      if (ans) { answer = toNum(ans[1], ans[2]) - 1; inExplanation = false; continue; }
      const meta = line.match(/^\s*(解説|分野|年度)\s*[:：]\s*(.*)$/);
      if (meta) {
        if (meta[1] === '解説') { explanation = meta[2]; inExplanation = true; }
        else if (meta[1] === '分野') { category = meta[2].trim() || category; inExplanation = false; }
        else { year = Number(meta[2]) || year; inExplanation = false; }
        continue;
      }
      const ch = line.match(choiceRe);
      if (ch) { choices.push(ch[4].trim()); inExplanation = false; continue; }
      if (inExplanation) { explanation += `\n${line.trim()}`; continue; }
      if (choices.length === 0) textLines.push(line.trim());
      else choices[choices.length - 1] += ` ${line.trim()}`; // 選択肢の折返し行
    }

    const qText = textLines.join('\n').replace(/^[〔\[]?問(題)?\s*[0-9０-９]+[〕\]]?[.．\s]*/, '').trim();
    if (!qText || choices.length < 2) {
      warnings.push(`${bi + 1}番目のブロックを問題として認識できませんでした`);
      return;
    }
    if (answer === null || answer < 0 || answer >= choices.length) {
      warnings.push(`「${qText.slice(0, 15)}…」に正解の指定(例: 正解 3)がないため仮に1としました`);
      answer = 0;
    }
    // id は取り込み時に資格ID接頭辞付きで採番される(normalizeExam)
    questions.push({
      year, category, text: qText, choices, answer,
      explanation: explanation.trim(),
    });
  });

  return { questions, warnings };
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
