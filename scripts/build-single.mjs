// ============================================================
// 単一ファイルビルド:アプリ全体を 1 つの HTML にまとめる
//   node scripts/build-single.mjs            → dist/kakomon-plus.html(そのままブラウザで開ける)
//   node scripts/build-single.mjs --artifact <path> → head/body タグなしの埋め込み用も出力
//
// ES モジュールを依存順に連結し import/export を除去した
// classic <script> にする(サーバー不要・file:// でも動く)。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 連結順 = 依存順(後のファイルは前のファイルの名前を参照できる)
const JS_ORDER = [
  'js/utils.js',
  'js/storage.js',
  'js/data/exams/it-sample.js',
  'js/data/exams/kenchiku1.js',
  'js/data/questions.js',
  'js/components/drawing.js',
  'js/components/chart.js',
  'js/views/home.js',
  'js/views/quiz.js',
  'js/views/exam.js',
  'js/views/stats.js',
  'js/views/settings.js',
  'js/views/feedback.js',
  'js/views/import.js',
  'js/app.js',
];

function stripModuleSyntax(src) {
  return src
    // import 文(複数行対応)を除去
    .replace(/^import\s[\s\S]*?from\s*['"][^'"]+['"];?\s*$/gm, '')
    // export の修飾だけ外す(export const → const など)
    .replace(/^export\s+(?=(const|let|function|class)\b)/gm, '');
}

const css = readFileSync(join(root, 'css/style.css'), 'utf8');

const js = JS_ORDER
  .map((p) => `// ---- ${p} ----\n${stripModuleSyntax(readFileSync(join(root, p), 'utf8'))}`)
  .join('\n');

// index.html から <body> の中身を抜き出し、module スクリプト参照を除去
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const body = indexHtml
  .match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/\s*<script type="module"[^>]*><\/script>/, '');
const title = indexHtml.match(/<title>([\s\S]*?)<\/title>/)[1];

const core = `<title>${title}</title>
<style>
${css}
</style>
${body}
<script>
(function () {
${js}
})();
</script>
`;

const standalone = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${title}</title>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
(function () {
${js}
})();
</script>
</body>
</html>`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/kakomon-plus.html'), standalone);
console.log('built: dist/kakomon-plus.html', `(${(standalone.length / 1024).toFixed(0)} KB)`);

const artifactFlag = process.argv.indexOf('--artifact');
if (artifactFlag !== -1 && process.argv[artifactFlag + 1]) {
  writeFileSync(process.argv[artifactFlag + 1], core);
  console.log('built (artifact body-only):', process.argv[artifactFlag + 1]);
}
