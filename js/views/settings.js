// ============================================================
// 設定:テーマ / 自動で次へ / プレミアム(デモ) / データリセット
// ============================================================
import { getSettings, updateSettings, isPremium, setPremium, resetAll } from '../storage.js';

export function renderSettings(root) {
  const s = getSettings();

  root.innerHTML = `
    <div class="card">
      <h2>設定</h2>
      <p class="sub">設定はこの端末(ブラウザ)に保存されます。</p>

      <div class="setting-row">
        <div class="sr-main">
          <div class="sr-title">テーマ</div>
          <div class="sr-desc">「自動」は端末の設定に合わせます</div>
        </div>
        <select class="select" id="theme-select">
          <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>自動</option>
          <option value="light" ${s.theme === 'light' ? 'selected' : ''}>ライト</option>
          <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>ダーク</option>
        </select>
      </div>

      <div class="setting-row">
        <div class="sr-main">
          <div class="sr-title">解答後に自動で次の問題へ</div>
          <div class="sr-desc">解説を読む時間を確保しつつテンポよく進めます</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="auto-advance" ${s.autoAdvance ? 'checked' : ''}>
          <span class="track"></span>
        </label>
      </div>

      <div class="setting-row">
        <div class="sr-main">
          <div class="sr-title">自動で進むまでの秒数</div>
        </div>
        <select class="select" id="auto-delay">
          ${[2, 3, 5, 8, 10].map((v) => `<option value="${v}" ${s.autoAdvanceDelay === v ? 'selected' : ''}>${v}秒</option>`).join('')}
        </select>
      </div>

      <div class="setting-row">
        <div class="sr-main">
          <div class="sr-title">プレミアム(デモ)<span class="badge badge-premium" style="margin-left:6px">✦</span></div>
          <div class="sr-desc">弱点強化型模試などの有料予定機能。プロトタイプでは自由に切り替えられます</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="premium-toggle" ${isPremium() ? 'checked' : ''}>
          <span class="track"></span>
        </label>
      </div>
    </div>

    <div class="card">
      <h2>データ</h2>
      <div class="setting-row">
        <div class="sr-main">
          <div class="sr-title">学習データをリセット</div>
          <div class="sr-desc">解答履歴・統計・設定をすべて削除します(元に戻せません)</div>
        </div>
        <button class="btn" id="reset-btn" type="button" style="color:var(--ng); border-color:var(--ng)">リセット</button>
      </div>
    </div>
  `;

  root.querySelector('#theme-select').addEventListener('change', (e) => {
    updateSettings({ theme: e.target.value });
    const dark = e.target.value === 'dark' ||
      (e.target.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  });
  root.querySelector('#auto-advance').addEventListener('change', (e) => {
    updateSettings({ autoAdvance: e.target.checked });
  });
  root.querySelector('#auto-delay').addEventListener('change', (e) => {
    updateSettings({ autoAdvanceDelay: Number(e.target.value) });
  });
  root.querySelector('#premium-toggle').addEventListener('change', (e) => {
    setPremium(e.target.checked);
  });
  root.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('学習データをすべて削除します。よろしいですか?')) {
      resetAll();
      location.hash = '#/';
    }
  });
}
