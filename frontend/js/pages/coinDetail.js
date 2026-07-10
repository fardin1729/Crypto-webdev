/**
 * CoinVista — Coin Detail Page Handler
 */

let detailChart = null;
let predictChart = null;
let coinId = null;
let coinData = null;
let chartPrices = []; // Full raw price array

// Parse query params to get coin ID
const params = new URLSearchParams(window.location.search);
coinId = params.get('id');

if (!coinId) {
  window.location.href = 'index.html';
}

// Format wrappers
function fmt(val) {
  if (val === undefined || val === null) return '–';
  if (val >= 1000) return '$' + val.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (val >= 1) return '$' + val.toFixed(2);
  return '$' + val.toFixed(6);
}

function pctPill(val) {
  if (val === undefined || val === null) return '<span class="pct-pill zero">0.00%</span>';
  const isUp = val >= 0;
  return `<span class="pct-pill ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${Math.abs(val).toFixed(2)}%</span>`;
}

// Initialise the page
async function initDetail() {
  applyTheme(localStorage.getItem('cv_theme') || 'dark');
  document.getElementById('detail-loading').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
  document.getElementById('detail-error').style.display = 'none';

  try {
    // 1. Fetch coin market stats
    const p = new URLSearchParams({ vs_currency: 'usd', ids: coinId, sparkline: false });
    const r = await fetch(`${API}/coins/markets?${p}`);
    if (!r.ok) throw new Error('API request failed');
    const coins = await r.json();
    if (!coins.length) throw new Error('Coin not found');
    coinData = coins[0];

    // 2. Render HTML details
    renderCoinDetails();

    // 3. Load initial Chart (30d)
    await changeTimeframe('30d');

    // 5. Hook up buttons
    document.getElementById('btn-chart-1h').addEventListener('click', () => changeTimeframe('1h'));
    document.getElementById('btn-chart-24h').addEventListener('click', () => changeTimeframe('24h'));
    document.getElementById('btn-chart-7d').addEventListener('click', () => changeTimeframe('7d'));
    document.getElementById('btn-chart-30d').addEventListener('click', () => changeTimeframe('30d'));
    document.getElementById('btn-chart-1y').addEventListener('click', () => changeTimeframe('1y'));

    document.getElementById('btn-run-predict').addEventListener('click', runPrediction);

    document.getElementById('detail-loading').style.display = 'none';
    document.getElementById('detail-content').style.display = 'block';

  } catch (err) {
    console.error(err);
    document.getElementById('detail-loading').style.display = 'none';
    document.getElementById('detail-error').style.display = 'block';
    document.getElementById('error-message').textContent = err.message || 'Failed to load data';
  }
}

function renderCoinDetails() {
  document.getElementById('coin-image').src = coinData.image;
  document.getElementById('coin-image').alt = coinData.name;
  document.getElementById('coin-name').textContent = coinData.name;
  document.getElementById('coin-symbol').textContent = coinData.symbol.toUpperCase();
  document.getElementById('coin-price').textContent = fmt(coinData.current_price);
  document.getElementById('coin-rank').textContent = `Rank #${coinData.market_cap_rank || '–'}`;

  // Price changes
  const c24 = coinData.price_change_percentage_24h_in_currency || coinData.price_change_percentage_24h;
  const c7 = coinData.price_change_percentage_7d_in_currency || 0;
  document.getElementById('price-changes-row').innerHTML = `
    ${pctPill(c24)} <small style="color:var(--text-muted);font-size:0.75rem;align-self:center;">24h</small>
    ${pctPill(c7)} <small style="color:var(--text-muted);font-size:0.75rem;align-self:center;">7d</small>
  `;

  // Stats Grid
  document.getElementById('stat-mcap').textContent = fmt(coinData.market_cap);
  document.getElementById('stat-volume').textContent = fmt(coinData.total_volume);
  document.getElementById('stat-high').textContent = fmt(coinData.high_24h);
  document.getElementById('stat-low').textContent = fmt(coinData.low_24h);
  document.getElementById('stat-circulating').textContent = coinData.circulating_supply ? (coinData.circulating_supply / 1e6).toFixed(2) + 'M ' + coinData.symbol.toUpperCase() : '–';
  document.getElementById('stat-max').textContent = coinData.max_supply ? (coinData.max_supply / 1e6).toFixed(2) + 'M ' + coinData.symbol.toUpperCase() : '∞';
}



async function changeTimeframe(tf) {
  // Toggle tab buttons
  const buttons = {
    '1h': 'btn-chart-1h',
    '24h': 'btn-chart-24h',
    '7d': 'btn-chart-7d',
    '30d': 'btn-chart-30d',
    '1y': 'btn-chart-1y'
  };
  
  Object.values(buttons).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(buttons[tf]);
  if (activeBtn) activeBtn.classList.add('active');

  // Determine days parameter for API
  let daysParam = 30;
  if (tf === '1h' || tf === '24h') daysParam = 1;
  else if (tf === '7d') daysParam = 7;
  else if (tf === '30d') daysParam = 30;
  else if (tf === '1y') daysParam = 365;

  try {
    const chartR = await fetch(`${API}/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`);
    if (!chartR.ok) throw new Error('Failed to fetch chart data');
    const chartData = await chartR.json();
    let prices = chartData.prices || [];

    // Post-process slice for 1h (last 12 points of 5-min intervals)
    if (tf === '1h') {
      prices = prices.slice(-12);
    }

    chartPrices = prices;
    renderHistoryChart(tf);
  } catch (err) {
    console.error('Timeframe load failed:', err);
  }
}

function renderHistoryChart(tf) {
  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }

  const isDayView = tf === '1h' || tf === '24h';
  
  const labels = chartPrices.map(p => {
    const date = new Date(p[0]);
    if (isDayView) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const vals = chartPrices.map(p => p[1]);
  const isUp = vals[vals.length - 1] >= vals[0];
  const lineColor = isUp ? '#10b981' : '#ef4444';

  const ctx = document.getElementById('detail-chart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, lineColor + '33');
  grad.addColorStop(1, lineColor + '00');

  const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';

  detailChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: vals,
        borderColor: lineColor,
        backgroundColor: grad,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,15,26,0.95)',
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: { label: c => fmt(c.raw) }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => fmt(v) }, position: 'right' }
      }
    }
  });
}

function runPrediction() {
  const btn = document.getElementById('btn-run-predict');
  const working = document.getElementById('predict-working');
  const result = document.getElementById('predict-result');
  const errEl = document.getElementById('predict-error');
  const fill = document.getElementById('predict-fill');
  const label = document.getElementById('predict-label');
  const stats = document.getElementById('predict-stats');

  btn.disabled = true;
  btn.textContent = 'Training Neural Net…';
  working.style.display = '';
  result.style.display = 'none';
  errEl.style.display = 'none';
  if (predictChart) { predictChart.destroy(); predictChart = null; }

  runLSTMPrediction(
    coinId,
    /* onProgress */ (pct, msg) => {
      fill.style.width = pct + '%';
      label.textContent = msg;
    },
    /* onDone */ ({ prices, dates, futurePrices, futureDates, std }) => {
      working.style.display = 'none';
      result.style.display = '';
      btn.textContent = '🔄 Re-run Model';
      btn.disabled = false;

      const lastPrice = prices[prices.length - 1];
      const pred3 = futurePrices[2] ?? futurePrices[futurePrices.length - 1];
      const pred7 = futurePrices[6] ?? futurePrices[futurePrices.length - 1];
      const chg3 = ((pred3 - lastPrice) / lastPrice) * 100;
      const chg7 = ((pred7 - lastPrice) / lastPrice) * 100;

      const statCard = (label, value, cls = '') =>
        `<div class="predict-stat"><div class="predict-stat-label">${label}</div><div class="predict-stat-value ${cls}">${value}</div></div>`;

      stats.innerHTML =
        statCard('Current Price', fmt(lastPrice)) +
        statCard('Predicted 3d', fmt(pred3), chg3 >= 0 ? 'up' : 'down') +
        statCard('3d Change', (chg3 >= 0 ? '+' : '') + chg3.toFixed(2) + '%', chg3 >= 0 ? 'up' : 'down') +
        statCard('Predicted 7d', fmt(pred7), chg7 >= 0 ? 'up' : 'down') +
        statCard('7d Change', (chg7 >= 0 ? '+' : '') + chg7.toFixed(2) + '%', chg7 >= 0 ? 'up' : 'down') +
        statCard('ML Sentiment', chg7 >= 0 ? '📈 Bullish' : '📉 Bearish', chg7 >= 0 ? 'up' : 'down');

      // Combined chart
      const histLabels = dates.slice(-30).map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const histPrices = prices.slice(-30);
      const futureLabels = futureDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const allLabels = [...histLabels, ...futureLabels];
      const histData = [...histPrices, ...Array(futureLabels.length).fill(null)];
      const predData = [...Array(histLabels.length - 1).fill(null), histPrices[histPrices.length - 1], ...futurePrices];
      const upperBand = predData.map(v => v !== null ? v + std : null);
      const lowerBand = predData.map(v => v !== null ? v - std : null);

      const ctx = document.getElementById('predict-chart').getContext('2d');
      const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';
      predictChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: allLabels,
          datasets: [
            { label: 'Historical', data: histData, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true },
            { label: 'LSTM Forecast', data: predData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', borderWidth: 2, borderDash: [6, 3], pointRadius: 3, pointBackgroundColor: '#06b6d4', tension: 0.4, fill: true },
            { label: 'Upper Band', data: upperBand, borderColor: 'rgba(6,182,212,0.2)', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false },
            { label: 'Lower Band', data: lowerBand, borderColor: 'rgba(6,182,212,0.2)', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(6,182,212,0.05)' },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, boxWidth: 8 } },
            tooltip: { backgroundColor: 'rgba(15,15,26,0.95)', titleColor: '#94a3b8', bodyColor: '#e2e8f0', padding: 10, callbacks: { label: c => c.dataset.label + ': ' + fmt(c.raw) } },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => fmt(v) }, position: 'right' },
          },
        },
      });
    },
    /* onError */ (msg) => {
      working.style.display = 'none';
      errEl.style.display = '';
      errEl.textContent = '⚠️ Prediction failed: ' + msg;
      btn.disabled = false;
      btn.textContent = 'Retry Prediction';
    },
    chartPrices // pass full price history
  );
}

document.addEventListener('DOMContentLoaded', initDetail);
