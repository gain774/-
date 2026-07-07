// ============================================================
// フィードバック:不具合報告・要望の送信
// サーバーが無いプロトタイプのため、メール(mailto)と
// クリップボードコピーで受け付ける。将来はフォームサービスや
// issue 連携に置き換える(README 参照)。
// ============================================================

// 送付先(公開前に運営用アドレスに変更する)
const FEEDBACK_EMAIL = 'ks07shuhei26@gmail.com';

export function renderFeedback(root) {
  root.innerHTML = `
    <div class="card">
      <h2>フィードバックを送る</h2>
      <p class="sub">不具合の報告や「こうしてほしい」という要望をお寄せください。いただいた内容をもとにアプリを改善していきます。</p>

      <div class="field">
        <label for="fb-type">種別</label>
        <select class="select" id="fb-type" style="width:100%">
          <option value="不具合の報告">不具合の報告</option>
          <option value="機能の要望">機能の要望</option>
          <option value="問題の誤りの指摘">問題の誤りの指摘</option>
          <option value="その他">その他</option>
        </select>
      </div>

      <div class="field">
        <label for="fb-body">内容</label>
        <textarea class="textarea" id="fb-body" placeholder="例)スマホ横画面で選択肢が見切れる/◯△✕のマークを長押しで一気に付けたい など"></textarea>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px">
        <button class="btn btn-primary btn-lg" id="fb-mail" type="button">メールで送る</button>
        <button class="btn btn-lg" id="fb-copy" type="button">内容をコピーする</button>
      </div>
      <p class="sub" id="fb-status" role="status" style="margin:10px 0 0"></p>
    </div>

    <div class="notice">
      メールアプリが開かない環境では「内容をコピーする」を押して、任意の連絡手段で <strong>${FEEDBACK_EMAIL}</strong> 宛にお送りください。
    </div>
  `;

  const typeEl = root.querySelector('#fb-type');
  const bodyEl = root.querySelector('#fb-body');
  const statusEl = root.querySelector('#fb-status');

  function buildText() {
    const env = `画面: ${window.innerWidth}×${window.innerHeight} / UA: ${navigator.userAgent}`;
    return `【種別】${typeEl.value}\n【内容】\n${bodyEl.value.trim()}\n\n---\n${env}`;
  }

  root.querySelector('#fb-mail').addEventListener('click', () => {
    if (!bodyEl.value.trim()) {
      statusEl.textContent = '内容を入力してください。';
      bodyEl.focus();
      return;
    }
    const subject = encodeURIComponent(`[カコモン+] ${typeEl.value}`);
    const body = encodeURIComponent(buildText());
    location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    statusEl.textContent = 'メールアプリを開きました。送信して完了です。';
  });

  root.querySelector('#fb-copy').addEventListener('click', async () => {
    if (!bodyEl.value.trim()) {
      statusEl.textContent = '内容を入力してください。';
      bodyEl.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(buildText());
      statusEl.textContent = 'コピーしました。メール等に貼り付けて送ってください。';
    } catch {
      statusEl.textContent = 'コピーできませんでした。本文を選択して手動でコピーしてください。';
    }
  });
}
