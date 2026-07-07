// ============================================================
// 問題データベース(レジストリ)
// 内蔵の資格データ + 利用者が取り込んだ資格データをまとめて扱う。
// 資格データの形式:
//   { id, name, description, categories: string[], questions: [
//       { id, year, category, text, choices: string[], answer: number, explanation } ] }
// 実際の過去問を取り込む際は、各資格団体の著作権・利用規約を
// 確認のうえ「問題データの管理」画面(#/import)から追加する。
// ============================================================
import { IT_SAMPLE } from './exams/it-sample.js';
import { KENCHIKU1 } from './exams/kenchiku1.js';
import { getSettings, getImportedExams } from '../storage.js';

const BUILT_IN = [KENCHIKU1, IT_SAMPLE];

export function getAllExams() {
  return [...BUILT_IN, ...getImportedExams()];
}

export function getExam(examId) {
  return getAllExams().find((e) => e.id === examId) || null;
}

// 現在選択中の資格(未選択・削除済みなら先頭の内蔵資格)
export function getActiveExam() {
  return getExam(getSettings().examId) || BUILT_IN[0];
}

// qid から問題を全資格横断で検索(再開データが資格切替をまたいでも動くように)
export function getQuestionById(qid) {
  for (const exam of getAllExams()) {
    const q = exam.questions.find((x) => x.id === qid);
    if (q) return q;
  }
  return undefined;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
