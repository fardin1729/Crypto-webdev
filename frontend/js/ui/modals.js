/* ── Index Modal ── */
function openIndexModal(type) {
  const modal = document.getElementById('index-modal');
  const overlay = document.getElementById('modal-overlay');
  const header = document.getElementById('index-modal-header');
  const body = document.getElementById('index-modal-body');
  
  // Hide other modals just in case
  document.getElementById('coin-modal').style.display = 'none';

  let title = '', content = '';
  
  if (type === 'mcap') {
    title = 'Total Market Capitalization';
    content = `
      <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
        The Total Market Capitalization index tracks the combined fiat value of all circulating cryptocurrencies. 
        It represents the total valuation of the global crypto market.
      </p>
      <div style="margin-top:16px; background:var(--bg-2); padding:16px; border-radius:12px; border:1px solid var(--border);">
        <h4 style="margin-bottom:8px; font-size:0.85rem; color:var(--text-dim); text-transform:uppercase;">Metrics Explained</h4>
        <ul style="font-size:0.85rem; color:var(--text); padding-left:20px; line-height:1.8;">
          <li><b>24h Vol:</b> Total trading volume across all tracked exchanges in the last 24 hours. A rising volume alongside rising market cap indicates strong momentum.</li>
          <li><b>BTC Dom:</b> Bitcoin Dominance measures Bitcoin's share of the total market. When BTC dominance rises, altcoins typically lose value relative to Bitcoin.</li>
        </ul>
      </div>
    `;
  } else if (type === 'vista20') {
    title = 'Vista20 Index';
    content = `
      <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
        The Vista20 is a proprietary market index that tracks the performance of the top 20 cryptocurrencies by market cap, 
        providing a broader view of blue-chip crypto health independent of Bitcoin's heavy weighting.
      </p>
      <div style="margin-top:16px; background:var(--bg-2); padding:16px; border-radius:12px; border:1px solid var(--border);">
        <h4 style="margin-bottom:8px; font-size:0.85rem; color:var(--text-dim); text-transform:uppercase;">Index Construction</h4>
        <ul style="font-size:0.85rem; color:var(--text); padding-left:20px; line-height:1.8;">
          <li><b>Base Asset:</b> USD ($)</li>
          <li><b>Components:</b> The top 20 non-stablecoin crypto assets by circulating market capitalization.</li>
          <li><b>Methodology:</b> Equal-weight average of 24-hour percentage changes, anchored to a normalized market cap ratio.</li>
        </ul>
      </div>
    `;
  } else if (type === 'fg') {
    title = 'Fear & Greed Index';
    content = `
      <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
        The Crypto Fear and Greed Index analyzes current sentiment of the Bitcoin market. 
        Extreme fear can be a sign that investors are overly worried (a buying opportunity), while extreme greed indicates the market is due for a correction.
      </p>
      <div style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:var(--bg-2); padding:12px; border-radius:12px; border:1px solid var(--border); text-align:center;">
          <div style="font-size:1.5rem; font-weight:800; color:var(--red);">0-24</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Extreme Fear</div>
        </div>
        <div style="background:var(--bg-2); padding:12px; border-radius:12px; border:1px solid var(--border); text-align:center;">
          <div style="font-size:1.5rem; font-weight:800; color:var(--green);">75-100</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Extreme Greed</div>
        </div>
      </div>
      <p style="margin-top:16px; font-size:0.8rem; color:var(--text-dim); text-align:center;">
        Data provided by <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" style="color:var(--primary);">Alternative.me</a>. 
        Calculated using Volatility (25%), Momentum (25%), Social Media (15%), Surveys (15%), Dominance (10%), and Trends (10%).
      </p>
    `;
  } else if (type === 'altcoin') {
    title = 'Altcoin Season Index';
    content = `
      <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
        The Altcoin Season Index measures whether the market is favoring Bitcoin or alternative cryptocurrencies ("Altcoins").
        When the score is 75 or higher, it is considered "Altcoin Season."
      </p>
      <div style="margin-top:16px; background:var(--bg-2); padding:16px; border-radius:12px; border:1px solid var(--border);">
        <h4 style="margin-bottom:8px; font-size:0.85rem; color:var(--text-dim); text-transform:uppercase;">How it works</h4>
        <p style="font-size:0.85rem; color:var(--text); line-height:1.6;">
          This metric is inversely derived from Bitcoin Dominance. When Bitcoin's market share drops as capital rotates into smaller assets, 
          the Altcoin Season score rises. A score below 25 indicates capital is flowing heavily back into Bitcoin ("Bitcoin Season").
        </p>
      </div>
    `;
  }
  
  header.innerHTML = `<h2>${title}</h2>`;
  body.innerHTML = content;
  
  overlay.classList.add('open');
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

/* ── Coin Modal ── */
let modalChart = null;
let predictChart = null;
let currentModalCoinId = null;

async function openModal(id) {
  currentModalCoinId = id;
  const overlay = document.getElementById('modal-overlay');
  const header  = document.getElementById('modal-header');
  const body    = document.getElementById('modal-body');
  document.getElementById('index-modal').style.display = 'none';
  document.getElementById('coin-modal').style.display = 'flex'; // Reset to standard display
  
  header.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  body.innerHTML   = '';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    // ── Use cached coin data from the market table (no extra API call needed) ──
    const cached = state.coins.find(c => c.id === id);
    const cur    = state.currency;

    // Only fetch the chart (1 call instead of 2)
    const chartR = await fetch(`${API}/coins/${id}/market_chart?vs_currency=usd&days=120`);
    if (!chartR.ok) throw new Error(`HTTP ${chartR.status}`);
    const chartData = await chartR.json();

    // Cache full 120-day history for LSTM
    state.modalPriceData = chartData.prices || [];
    const displayPrices  = state.modalPriceData.slice(-30);

    // Build header from cached data (or chart data for price)
    const currentPrice = cached?.current_price ?? displayPrices[displayPrices.length - 1]?.[1];
    const c24 = cached?.price_change_percentage_24h_in_currency ?? cached?.price_change_percentage_24h;
    const c7  = cached?.price_change_percentage_7d_in_currency  ?? null;
    const name   = cached?.name   ?? id;
    const symbol = cached?.symbol ?? '';
    const rank   = cached?.market_cap_rank ?? '–';
    const image  = cached?.image  ?? '';

    header.innerHTML = `
      <div class="modal-coin-top">
        <img class="modal-coin-icon" src="${image}" alt="${name}" onerror="this.style.display='none'"/>
        <div><div class="modal-coin-name">${name}</div><div class="modal-coin-symbol">${symbol.toUpperCase()}</div></div>
        <span class="modal-coin-rank">Rank #${rank}</span>
      </div>
      <div class="modal-price">${fmt(currentPrice)}</div>
      <div class="modal-price-changes">
        ${pctPill(c24)} <small style="color:var(--text-muted);font-size:0.75rem">24h</small>
        ${pctPill(c7)}  <small style="color:var(--text-muted);font-size:0.75rem">7d</small>
      </div>`;

    body.innerHTML = `
      <div class="modal-stats-grid">
        <div class="modal-stat"><div class="modal-stat-label">Market Cap</div><div class="modal-stat-value">${fmt(cached?.market_cap)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">24h Volume</div><div class="modal-stat-value">${fmt(cached?.total_volume)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">24h High</div><div class="modal-stat-value">${fmt(cached?.high_24h)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">24h Low</div><div class="modal-stat-value">${fmt(cached?.low_24h)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">Circulating Supply</div><div class="modal-stat-value">${cached?.circulating_supply ? (cached.circulating_supply/1e6).toFixed(2)+'M' : '–'}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">Max Supply</div><div class="modal-stat-value">${cached?.max_supply ? (cached.max_supply/1e6).toFixed(2)+'M' : '∞'}</div></div>
      </div>
      <div class="modal-chart-title">Price Chart — Last 30 Days</div>
      <div class="modal-chart-wrap"><canvas id="modal-chart" height="200"></canvas></div>`;

    if (modalChart) { modalChart.destroy(); modalChart = null; }
    const labels = displayPrices.map(p => new Date(p[0]).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    const vals   = displayPrices.map(p => p[1]);
    const isUp   = vals[vals.length-1] >= vals[0];
    const lineColor = isUp ? '#10b981' : '#ef4444';
    const ctx  = document.getElementById('modal-chart').getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,200);
    grad.addColorStop(0, lineColor+'40'); grad.addColorStop(1, lineColor+'00');
    const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';
    modalChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data:vals, borderColor:lineColor, backgroundColor:grad, borderWidth:2, pointRadius:0, tension:0.4, fill:true }] },
      options: { responsive:true, interaction:{intersect:false,mode:'index'},
        plugins: { legend:{display:false}, tooltip:{backgroundColor:'rgba(15,15,26,0.95)',titleColor:'#94a3b8',bodyColor:'#e2e8f0',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,padding:10,callbacks:{label:c=>fmt(c.raw)}} },
        scales: { x:{grid:{color:gridColor},ticks:{color:'#64748b',maxTicksLimit:8,font:{size:11}}}, y:{grid:{color:gridColor},ticks:{color:'#64748b',font:{size:11},callback:v=>fmt(v)},position:'right'} } }
    });
  } catch(e) {
    document.getElementById('predict-panel').style.display = 'none';
    header.innerHTML = '';
    body.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:2.5rem;margin-bottom:12px">⚠️</div>
        <div style="color:var(--text);font-weight:600;margin-bottom:8px">Couldn't load chart data</div>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px">
          ${e.message.includes('429') || e.message.includes('HTTP') ? 'CoinGecko API rate-limited — please wait 30s and retry.' : 'Check your internet connection.'}
        </div>
        <button onclick="openModal('${id}')" style="background:var(--primary);color:#fff;padding:10px 24px;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;border:none">
          Retry
        </button>
      </div>`;
    return;
  }

  // Show prediction panel (reset state)
  const panel = document.getElementById('predict-panel');
  const working = document.getElementById('predict-working');
  const result = document.getElementById('predict-result');
  const errEl = document.getElementById('predict-error');
  const btn = document.getElementById('btn-run-predict');
  panel.style.display = '';
  working.style.display = 'none';
  result.style.display = 'none';
  errEl.style.display = 'none';
  document.getElementById('predict-fill').style.width = '0%';
  document.getElementById('predict-label').textContent = 'Initialising…';
  document.getElementById('predict-stats').innerHTML = '';
  if (predictChart) { predictChart.destroy(); predictChart = null; }
  btn.disabled = false;
  btn.textContent = 'Run Prediction';
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('index-modal').style.display = 'none';
  if (modalChart)  { modalChart.destroy();  modalChart  = null; }
  if (predictChart){ predictChart.destroy(); predictChart = null; }
  currentModalCoinId = null;
}
