/* ── Formatters ── */
function fmt(n, currency=state.currency) {
  if (n===null||n===undefined) return '–';
  const s = CURRENCY_SYMBOLS[currency]||'$';
  if (Math.abs(n)>=1e9) return s+(n/1e9).toFixed(2)+'B';
  if (Math.abs(n)>=1e6) return s+(n/1e6).toFixed(2)+'M';
  if (Math.abs(n)>=1e3) return s+(n/1e3).toFixed(2)+'K';
  if (Math.abs(n)>=1) return s+n.toLocaleString('en-US',{maximumFractionDigits:6});
  return s+n.toPrecision(4);
}
function fmtPct(n) {
  if (n===null||n===undefined) return '–';
  return (n>=0?'+':'')+n.toFixed(2)+'%';
}
function pctPill(n) {
  if (n===null||n===undefined) return '<span class="change-pill">–</span>';
  const cls=n>=0?'up':'down', arrow=n>=0?'▲':'▼';
  return `<span class="change-pill ${cls}">${arrow} ${Math.abs(n).toFixed(2)}%</span>`;
}
function timeAgo(ts) {
  let ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  // If the number is in seconds (less than 10 billion), convert to milliseconds
  if (typeof ts === 'number' && ts < 10000000000) {
    ms = ts * 1000;
  }
  const d = Math.floor((Date.now() - ms) / 1000);
  if (d < 0) return 'just now'; // Prevent negative offsets due to minor system clock drift
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  return Math.floor(d / 86400) + 'd ago';
}

/* ── Sparklines ── */
function drawSparkline(canvas,data,color) {
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,color+'40'); g.addColorStop(1,color+'00');
  const path=new Path2D();
  data.forEach((v,i)=>{ const x=(i/(data.length-1))*w, y=h-((v-min)/range)*(h-4)-2; i===0?path.moveTo(x,y):path.lineTo(x,y); });
  path.lineTo(w,h); path.lineTo(0,h); path.closePath();
  ctx.fillStyle=g; ctx.fill(path);
  ctx.beginPath();
  data.forEach((v,i)=>{ const x=(i/(data.length-1))*w, y=h-((v-min)/range)*(h-4)-2; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
}

function drawIndexSparkline(canvasId, prices, isPositive) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !prices.length) return;
  const dpr  = window.devicePixelRatio || 1;
  const w    = canvas.offsetWidth || 200;
  const h    = 48;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const min  = Math.min(...prices);
  const max  = Math.max(...prices);
  const range = max - min || 1;
  const pad  = 4;
  const pts  = prices.map((p, i) => ({
    x: pad + (i / (prices.length - 1)) * (w - pad * 2),
    y: h - pad - ((p - min) / range) * (h - pad * 2)
  }));
  const color = isPositive ? '#16c784' : '#ea3943';
  // Fill gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '44');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();
}

/* ── Dynamic Greeting ── */
document.addEventListener("DOMContentLoaded", () => {
  const greetingEls = document.querySelectorAll(".dynamic-greeting");
  if (greetingEls.length > 0) {
    const hour = new Date().getHours();
    let greeting = "Good evening 🌙";
    if (hour < 12) greeting = "Good morning ☀️";
    else if (hour < 18) greeting = "Good afternoon ☕";
    greetingEls.forEach(el => el.textContent = greeting);
  }
});
