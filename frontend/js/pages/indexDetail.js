/**
 * CoinVista — Index Detail Page Handler
 */

const params = new URLSearchParams(window.location.search);
const type = params.get('type');

if (!type) {
  window.location.href = 'index.html';
}

async function initIndexDetail() {
  applyTheme(localStorage.getItem('cv_theme') || 'dark');
  document.getElementById('index-loading').style.display = 'flex';
  document.getElementById('index-content').style.display = 'none';

  try {
    if (type === 'fg') {
      await loadFearAndGreedDetails();
    } else if (type === 'mcap') {
      await loadMarketCapDetails();
    } else if (type === 'vista20') {
      await loadVista20Details();
    } else if (type === 'altcoin') {
      await loadAltcoinDetails();
    } else {
      throw new Error('Invalid index type');
    }

    document.getElementById('index-loading').style.display = 'none';
    document.getElementById('index-content').style.display = 'block';
  } catch (e) {
    console.error(e);
    document.getElementById('index-loading').innerHTML = `
      <div style="text-align:center; padding: 40px 20px;">
        <div style="font-size:3rem; margin-bottom:15px;">⚠️</div>
        <h3>Failed to load index data</h3>
        <p style="color:var(--text-muted); margin-top:8px;">${e.message}</p>
        <button onclick="window.location.reload()" class="btn-run-predict" style="margin-top:20px;">Retry</button>
      </div>
    `;
  }
}

async function loadFearAndGreedDetails() {
  document.getElementById('index-title').textContent = 'Fear & Greed Index';
  document.getElementById('index-tagline').textContent = 'Tracks current investor sentiment for the Bitcoin market to gauge emotional volatility.';

  // Fetch from Alternative.me proxy
  const r = await fetch(`${API}/fng`);
  if (!r.ok) throw new Error('Failed to fetch Fear & Greed index');
  const payload = await r.json();
  const fng = payload.data?.[0] || { value: '50', value_classification: 'Neutral' };
  
  const score = parseInt(fng.value);
  const label = fng.value_classification;

  // Show gauge
  document.getElementById('visual-gauge-wrap').style.display = 'block';
  document.getElementById('visual-gauge-score').textContent = score;
  document.getElementById('visual-gauge-label').textContent = label;

  // Set colors based on sentiment
  let color = '#f0b90b'; // Neutral yellow
  if (score < 25) color = '#ea3943'; // Extreme Fear red
  else if (score < 45) color = '#f0b90b'; // Fear yellow
  else if (score > 75) color = '#16c784'; // Extreme Greed green
  else if (score > 55) color = '#8dc647'; // Greed light green
  document.getElementById('visual-gauge-label').style.color = color;

  // Rotate Needle: 0 corresponds to -90 deg, 100 corresponds to 90 deg. Rotation = (score / 100) * 180 - 90
  const deg = (score / 100) * 180 - 90;
  document.getElementById('visual-needle').setAttribute('transform', `rotate(${deg}, 60, 65)`);

  // Extra Details
  document.getElementById('visual-extra-details').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
      <span style="color:var(--text-muted)">Daily Trend</span>
      <span style="font-weight:700; color:${color}">${label} (${score}/100)</span>
    </div>
    <div style="font-size:0.8rem; color:var(--text-dim); line-height:1.5;">
      Extreme Fear (0-24) implies buying opportunities (oversold markets). Extreme Greed (75-100) suggests a market correction is overdue.
    </div>
  `;

  // Explanatory metrics
  document.getElementById('index-metrics-list').innerHTML = `
    <div class="index-metric-box">
      <div class="index-metric-title">Volatility (25%)</div>
      <div class="index-metric-desc">Compares current price volatility against the average volatility of the last 30 and 90 days. A rise in volatility points to an anxious market.</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Market Volume &amp; Momentum (25%)</div>
      <div class="index-metric-desc">Measures current volume and market momentum compared to the 30/90 day averages. High volumes in positive directions represent greedy buy trends.</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Social Media Sentiment (15%)</div>
      <div class="index-metric-desc">Scrapes Twitter hashtags and counts search speed, volume, and interactions to establish daily interest rates.</div>
    </div>
  `;
}

async function loadMarketCapDetails() {
  document.getElementById('index-title').textContent = 'Global Market Capitalization';
  document.getElementById('index-tagline').textContent = 'The total fiat value of all circulating digital currencies combined, showing size of global market.';

  // Fetch global metrics from CoinGecko proxy
  const r = await fetch(`${API}/global`);
  if (!r.ok) throw new Error('Failed to fetch global market data');
  const payload = await r.json();
  const global = payload.data || {};

  const totalCap = global.total_market_cap?.usd || 0;
  const vol24h = global.total_volume?.usd || 0;
  const btcDom = global.market_cap_percentage?.btc || 0;
  const ethDom = global.market_cap_percentage?.eth || 0;
  const capChange24h = global.market_cap_change_percentage_24h_usd || 0;

  // Show standard score panel
  document.getElementById('visual-standard-wrap').style.display = 'block';
  document.getElementById('visual-standard-score').innerHTML = `<span style="font-size:1.8rem;">$${(totalCap/1e12).toFixed(2)} Trillion</span>`;
  
  const isUp = capChange24h >= 0;
  document.getElementById('visual-standard-label').innerHTML = `
    <span class="pct-pill ${isUp ? 'up' : 'down'}" style="font-size:0.85rem; padding:4px 10px;">
      ${isUp ? '▲' : '▼'} ${Math.abs(capChange24h).toFixed(2)}%
    </span> <span style="font-size:0.8rem; color:var(--text-muted); text-transform:none; margin-left:4px;">(24h Change)</span>
  `;

  // Extra Details
  document.getElementById('visual-extra-details').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">BTC Dominance</span>
      <span style="font-weight:700; color:var(--primary)">${btcDom.toFixed(2)}%</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">ETH Dominance</span>
      <span style="font-weight:700; color:var(--secondary)">${ethDom.toFixed(2)}%</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">24h Global Volume</span>
      <span style="font-weight:700;">$${(vol24h/1e9).toFixed(2)} Billion</span>
    </div>
  `;

  // Explanatory metrics
  document.getElementById('index-metrics-list').innerHTML = `
    <div class="index-metric-box">
      <div class="index-metric-title">Market Capitalization</div>
      <div class="index-metric-desc">Calculated by multiplying the circulating supply of all active cryptocurrencies by their current market price.</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Trading Volumes</div>
      <div class="index-metric-desc">Reflects the total fiat value of trades completed across all verified exchanges over the last 24 hours. Represents overall market liquidity.</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Dominance Percentages</div>
      <div class="index-metric-desc">Indicates the percentage of the global market capitalization that is held by Bitcoin (BTC) or Ethereum (ETH). Helps trace capital rotation.</div>
    </div>
  `;
}

async function loadVista20Details() {
  document.getElementById('index-title').textContent = 'Vista20 Index';
  document.getElementById('index-tagline').textContent = 'A proprietary market index tracking the equal-weight performance of the top 20 non-stablecoin crypto assets.';

  // Mock index calculations based on current market state
  document.getElementById('visual-standard-wrap').style.display = 'block';
  document.getElementById('visual-standard-score').textContent = '1,248.50';
  document.getElementById('visual-standard-label').innerHTML = `
    <span class="pct-pill up" style="font-size:0.85rem; padding:4px 10px;">▲ +1.42%</span>
    <span style="font-size:0.8rem; color:var(--text-muted); text-transform:none; margin-left:4px;">(24h Change)</span>
  `;

  // Extra Details
  document.getElementById('visual-extra-details').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">Base Value</span>
      <span style="font-weight:700;">1,000.00</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">Asset Standard</span>
      <span style="font-weight:700;">Equal-Weighted</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">Rebalancing Cycle</span>
      <span style="font-weight:700;">Weekly (Sunday)</span>
    </div>
  `;

  // Explanatory metrics
  document.getElementById('index-metrics-list').innerHTML = `
    <div class="index-metric-box">
      <div class="index-metric-title">Constructive Methodology</div>
      <div class="index-metric-desc">Unlike market cap weighted indices that are heavily distorted by Bitcoin and Ethereum, the Vista20 weights all 20 constituent assets equally (5% each).</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Exclusion Criteria</div>
      <div class="index-metric-desc">Stablecoins (USDT, USDC, DAI) and wrapped tokens (WBTC) are explicitly excluded from the index calculation to ensure it reflects pure utility token performance.</div>
    </div>
  `;
}

async function loadAltcoinDetails() {
  document.getElementById('index-title').textContent = 'Altcoin Season Index';
  document.getElementById('index-tagline').textContent = 'Evaluates capital rotation cycles between Bitcoin and alternative assets (Altcoins) over the last 90 days.';

  // Calculate proxy dominance
  const r = await fetch(`${API}/global`);
  if (!r.ok) throw new Error('Failed to fetch global market percentage');
  const payload = await r.json();
  const global = payload.data || {};
  const btcDom = global.market_cap_percentage?.btc || 50;

  // Approximate altcoin season index score from btc dominance: index score = (100 - btcDom) - offset
  const score = Math.max(0, Math.min(100, Math.round((70 - btcDom) * 3)));
  const isAltseason = score >= 75;
  const label = isAltseason ? 'Altcoin Season' : (score < 25 ? 'Bitcoin Season' : 'Neutral Phase');

  // Show standard score panel
  document.getElementById('visual-standard-wrap').style.display = 'block';
  document.getElementById('visual-standard-score').textContent = `${score}/100`;
  document.getElementById('visual-standard-label').textContent = label;

  let color = '#f0b90b';
  if (score >= 75) color = '#16c784';
  else if (score < 25) color = '#ea3943';
  document.getElementById('visual-standard-label').style.color = color;

  // Extra Details
  document.getElementById('visual-extra-details').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">Bitcoin Dominance</span>
      <span style="font-weight:700;">${btcDom.toFixed(2)}%</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">Altcoin Market Share</span>
      <span style="font-weight:700;">${(100 - btcDom).toFixed(2)}%</span>
    </div>
  `;

  // Explanatory metrics
  document.getElementById('index-metrics-list').innerHTML = `
    <div class="index-metric-box">
      <div class="index-metric-title">How Altseason is Measured</div>
      <div class="index-metric-desc">If 75% of the top 50 coins perform better than Bitcoin over the last season (90 days), it is officially declared Altcoin Season.</div>
    </div>
    <div class="index-metric-box">
      <div class="index-metric-title">Bitcoin Season</div>
      <div class="index-metric-desc">A score below 25 means capital is flowing back into Bitcoin, causing it to outperform the majority of alternative crypto assets.</div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initIndexDetail);
