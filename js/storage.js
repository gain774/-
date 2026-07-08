// ============================================================
// localStorage ラッパー:学習履歴・設定・プレミアムフラグ
// 将来サーバー同期(アカウント/課金)に置き換える際は
// このモジュールの実装だけを差し替えればよい。
// ============================================================

const KEY = 'kakomon-plus/v1';

const DEFAULTS = {
  settings: {
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    examId: 'kenchiku1',  // 選択中の資格
    answerMode: 'each',   // 'each'=一問一答 | 'end'=まとめて採点
    autoAdvance: false,   // 正解時に自動で次の問題へ
    autoAdvanceDelay: 3,  // 秒
  },
  // { qid, correct(bool), ts(ms), mode('practice'|'exam') } の配列
  history: [],
  // プレミアム(模試の弱点強化など)。プロトタイプではデモフラグ。
  premium: false,
  // 中断した演習の再開情報
  resume: null, // { qids: string[], index: number, correct: number, wrong: number, label: string }
  // 利用者が取り込んだ資格データ(権利確認済みの過去問など)
  importedExams: [],
  // 演習設定画面(#/practice)の前回の選択内容
  practice: null, // { years: number[], part: string, cats: string[], order: 'year'|'random', answerMode, count: number|0 }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS),
      ...data,
      settings: { ...DEFAULTS.settings, ...(data.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ストレージが使えない環境ではメモリ内のみで動作継続
  }
}

// ---------------- 設定 ----------------
export function getSettings() {
  return { ...state.settings };
}

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  save();
  return getSettings();
}

// ---------------- プレミアム ----------------
export function isPremium() {
  return !!state.premium;
}

export function setPremium(value) {
  state.premium = !!value;
  save();
}

// ---------------- 履歴 ----------------
export function recordAnswer(qid, correct, mode = 'practice') {
  state.history.push({ qid, correct: !!correct, ts: Date.now(), mode });
  // 履歴は最新 5000 件まで保持
  if (state.history.length > 5000) state.history = state.history.slice(-5000);
  save();
}

export function getHistory() {
  return [...state.history];
}

// 分野別の解答数と正答率
export function getCategoryStats(questionIndex) {
  const stats = new Map(); // category -> { total, correct }
  for (const h of state.history) {
    const q = questionIndex.get(h.qid);
    if (!q) continue;
    const s = stats.get(q.category) || { total: 0, correct: 0 };
    s.total += 1;
    if (h.correct) s.correct += 1;
    stats.set(q.category, s);
  }
  return stats;
}

// 各問題の「最後に解いた結果」
export function getLatestResults() {
  const latest = new Map(); // qid -> { correct, ts }
  for (const h of state.history) {
    latest.set(h.qid, { correct: h.correct, ts: h.ts });
  }
  return latest;
}

// validIds を渡すと、その問題群(=特定の資格)に絞って集計する
export function getSummary(validIds = null) {
  const hist = validIds ? state.history.filter((h) => validIds.has(h.qid)) : state.history;
  const total = hist.length;
  const correct = hist.filter((h) => h.correct).length;
  const days = new Set(hist.map((h) => new Date(h.ts).toDateString()));

  // 今日から遡った連続学習日数
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  // 今日まだ解いていなくても昨日までの連続は保つ
  if (streak === 0 && days.size > 0) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    while (days.has(y.toDateString())) {
      streak += 1;
      y.setDate(y.getDate() - 1);
    }
  }
  return { total, correct, accuracy: total ? correct / total : 0, studyDays: days.size, streak };
}

// ---------------- 取り込んだ資格データ ----------------
export function getImportedExams() {
  return [...(state.importedExams || [])];
}

export function addImportedExam(exam) {
  state.importedExams = (state.importedExams || []).filter((e) => e.id !== exam.id);
  state.importedExams.push(exam);
  save();
}

export function removeImportedExam(examId) {
  state.importedExams = (state.importedExams || []).filter((e) => e.id !== examId);
  // 削除した資格を選択中だった場合は既定に戻す
  if (state.settings.examId === examId) state.settings.examId = DEFAULTS.settings.examId;
  save();
}

// ---------------- 演習設定 ----------------
export function getPracticeConfig() {
  return state.practice ? { ...state.practice } : null;
}

export function savePracticeConfig(config) {
  state.practice = { ...config };
  save();
}

// ---------------- 再開 ----------------
export function saveResume(session) {
  state.resume = session;
  save();
}

export function getResume() {
  return state.resume ? { ...state.resume } : null;
}

export function clearResume() {
  state.resume = null;
  save();
}

// ---------------- リセット ----------------
export function resetAll() {
  state = structuredClone(DEFAULTS);
  save();
}
