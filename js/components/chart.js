// ============================================================
// 依存なし SVG 横棒グラフ(分野別正答率など 0〜100% の単一系列)
//  - 単一系列なので凡例なし(タイトルが系列名を兼ねる)
//  - 各バーの右端に値を直接ラベル表示
//  - 色は CSS カスタムプロパティ経由(light/dark 両対応・検証済み)
// ============================================================

export function renderBarChart(container, rows, { valueSuffix = '%' } = {}) {
  container.classList.add('viz-root');

  if (!rows.length) {
    container.innerHTML = '<p class="chart-empty">まだデータがありません。演習するとここに分野別の成績が表示されます。</p>';
    return;
  }

  const width = 640;
  const labelW = 118;
  const valueW = 52;
  const barH = 20;
  const gap = 16;
  const topPad = 8;
  const bottomPad = 26;
  const plotW = width - labelW - valueW;
  const height = topPad + rows.length * (barH + gap) - gap + bottomPad;

  const x = (v) => labelW + (Math.max(0, Math.min(100, v)) / 100) * plotW;

  const grid = [0, 25, 50, 75, 100].map((v) => `
    <line x1="${x(v)}" y1="${topPad}" x2="${x(v)}" y2="${height - bottomPad + 6}"
      stroke="var(--chart-grid)" stroke-width="1" />
    <text x="${x(v)}" y="${height - 6}" text-anchor="middle"
      font-size="11" fill="var(--muted)">${v}${valueSuffix}</text>
  `).join('');

  const bars = rows.map((r, i) => {
    const y = topPad + i * (barH + gap);
    const w = Math.max(0, (r.value / 100) * plotW);
    // データ端(右端)のみ 4px の角丸、ベースライン側は直角
    const rr = Math.min(4, w);
    const path = w <= 0 ? '' : `
      M ${labelW} ${y}
      h ${w - rr}
      a ${rr} ${rr} 0 0 1 ${rr} ${rr}
      v ${barH - rr * 2}
      a ${rr} ${rr} 0 0 1 ${-rr} ${rr}
      h ${-(w - rr)}
      Z`;
    return `
      <g class="chart-bar-hit">
        <title>${escapeXml(r.label)}: ${r.value}${valueSuffix}${r.detail ? `(${escapeXml(r.detail)})` : ''}</title>
        <rect x="0" y="${y - gap / 2}" width="${width}" height="${barH + gap}" fill="transparent"/>
        <text x="${labelW - 10}" y="${y + barH / 2}" text-anchor="end" dominant-baseline="central"
          font-size="12.5" fill="var(--ink-2)">${escapeXml(r.label)}</text>
        ${path ? `<path class="chart-bar" d="${path}" fill="var(--chart-series)"/>` : ''}
        <text x="${x(r.value) + 8}" y="${y + barH / 2}" dominant-baseline="central"
          font-size="12" font-weight="700" fill="var(--ink)">${r.value}${valueSuffix}</text>
      </g>`;
  }).join('');

  container.innerHTML = `
    <div class="chart-wrap">
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img"
        aria-label="横棒グラフ" style="min-width: 420px">
        ${grid}
        <line x1="${labelW}" y1="${topPad}" x2="${labelW}" y2="${height - bottomPad + 6}"
          stroke="var(--chart-baseline)" stroke-width="1.5" />
        ${bars}
      </svg>
    </div>
  `;
}

function escapeXml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
