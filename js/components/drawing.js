// ============================================================
// ペン / マーカー / 消しゴム の canvas オーバーレイ
// 問題カードの上に重ねて自由に書き込めるようにする。
// ============================================================

export const TOOLS = {
  pen: { label: 'ペン', stroke: '#d03b3b', width: 2.5, alpha: 1 },
  penBlue: { label: '青ペン', stroke: '#2a78d6', width: 2.5, alpha: 1 },
  marker: { label: 'マーカー', stroke: '#f5d90a', width: 16, alpha: 0.35 },
  eraser: { label: '消しゴム', stroke: '#000', width: 22, alpha: 1 },
};

// container(position:relative の要素)に描画レイヤーを取り付ける
export function attachDrawing(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'draw-layer';
  canvas.setAttribute('aria-label', '書き込みレイヤー');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let tool = 'pen';
  let active = false;   // 描画モードか(オフなら選択肢を普通に操作できる)
  let drawing = false;
  let last = null;

  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // リサイズで内容が消えるため退避して戻す
    let snapshot = null;
    if (canvas.width > 0 && canvas.height > 0) {
      snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d').drawImage(canvas, 0, 0);
    }
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (snapshot) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(snapshot, 0, 0);
      ctx.restore();
    }
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stroke(from, to) {
    const t = TOOLS[tool];
    ctx.globalAlpha = t.alpha;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = t.stroke;
    ctx.lineWidth = t.width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    last = pos(e);
    // 点をタップしただけでも描けるように
    stroke(last, { x: last.x + 0.01, y: last.y + 0.01 });
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    stroke(last, p);
    last = p;
  });

  const stop = () => { drawing = false; last = null; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    setTool(name) { if (TOOLS[name]) tool = name; },
    getTool() { return tool; },
    setActive(on) {
      active = on;
      container.classList.toggle('drawing', on);
    },
    isActive() { return active; },
    clear() {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },
    destroy() {
      observer.disconnect();
      canvas.remove();
    },
  };
}
