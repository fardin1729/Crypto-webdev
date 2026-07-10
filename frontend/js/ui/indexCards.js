/* ── Index Cards (Market Cap, Vista20, F&G, Altcoin Season) ── */
async function loadIndexCards(retryCount = 0) {
  // 1 & 2 & 4. CoinGecko Global + Vista20 + Altcoin Season
  try {
    const gRes  = await fetch(`${API}/global`);
    if (!gRes.ok) throw new Error('Global fetch failed');
    const { data } = await gRes.json();
    const mc    = data.total_market_cap?.usd  || 0;
    const chg   = data.market_cap_change_percentage_24h_usd || 0;
    const btcDom = data.market_cap_percentage?.btc || 50;
    const vol   = data.total_volume?.usd || 0;

    // Market Cap card
    document.getElementById('stat-mcap').textContent = fmt(mc);
    const mcChgEl = document.getElementById('stat-mcap-change');
    mcChgEl.textContent = (chg >= 0 ? '▲ ' : '▼ ') + Math.abs(chg).toFixed(2) + '%';
    mcChgEl.className   = 'index-card-change ' + (chg >= 0 ? 'positive' : 'negative');
    
    document.getElementById('stat-mcap-vol').textContent = fmt(vol);
    document.getElementById('stat-mcap-btc').textContent = btcDom.toFixed(1) + '%';

    // 4. Altcoin Season (inverse of BTC dominance, scaled)
    const altScore = Math.round(Math.max(0, Math.min(100, (1 - btcDom / 100) * 200 - 20)));
    document.getElementById('stat-alt-score').textContent = altScore;
    const btcDomEl = document.getElementById('stat-alt-btc-dom');
    if (btcDomEl) btcDomEl.textContent = btcDom.toFixed(1) + '%';
    
    const seasonLabelEl = document.getElementById('stat-alt-season-label');
    if (seasonLabelEl) {
      if (altScore >= 75) {
        seasonLabelEl.textContent = "Altcoin Season";
        seasonLabelEl.style.color = "var(--primary)";
      } else if (altScore <= 25) {
        seasonLabelEl.textContent = "Bitcoin Season";
        seasonLabelEl.style.color = "#f0b90b";
      } else {
        seasonLabelEl.textContent = "Neutral Season";
        seasonLabelEl.style.color = "var(--text-muted)";
      }
    }
    
    // Slider: btcDom% is BTC portion
    const btcFill = document.getElementById('alt-fill-btc');
    const altFill = document.getElementById('alt-fill-alt');
    if (btcFill) btcFill.style.width = btcDom.toFixed(1) + '%';
    if (altFill) altFill.style.width = (100 - btcDom).toFixed(1) + '%';

    // Vista20 & Sparklines
    const mRes  = await fetch(`${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h`);
    if (!mRes.ok) throw new Error('Markets fetch failed');
    const coins = await mRes.json();

    const v20Chg = coins.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / coins.length;
    const v20Price = coins.reduce((s, c) => s + (c.current_price * (c.market_cap / mc)), 0);

    document.getElementById('stat-vista20').textContent = '$' + v20Price.toFixed(2);
    const v20ChgEl = document.getElementById('stat-vista20-change');
    v20ChgEl.textContent = (v20Chg >= 0 ? '▲ ' : '▼ ') + Math.abs(v20Chg).toFixed(2) + '%';
    v20ChgEl.className   = 'index-card-change ' + (v20Chg >= 0 ? 'positive' : 'negative');
    
    let topGainer = coins[0], topLoser = coins[0];
    for (let c of coins) {
      if (c.price_change_percentage_24h > topGainer.price_change_percentage_24h) topGainer = c;
      if (c.price_change_percentage_24h < topLoser.price_change_percentage_24h) topLoser = c;
    }
    const topGainerEl = document.getElementById('stat-vista-gainer');
    if (topGainerEl) {
      topGainerEl.textContent = topGainer.symbol.toUpperCase() + ' +' + topGainer.price_change_percentage_24h.toFixed(1) + '%';
      topGainerEl.style.color = 'var(--green)';
    }
    const topLoserEl = document.getElementById('stat-vista-loser');
    if (topLoserEl) {
      topLoserEl.textContent = topLoser.symbol.toUpperCase() + ' ' + topLoser.price_change_percentage_24h.toFixed(1) + '%';
      topLoserEl.style.color = 'var(--red)';
    }

    drawIndexSparkline('spark-mcap', coins.map(c => c.sparkline_in_7d?.price || []).flat().slice(-48), chg >= 0);
    drawIndexSparkline('spark-vista20', coins[0]?.sparkline_in_7d?.price?.slice(-48) || [], v20Chg >= 0);

  } catch(e) { 
    console.warn('Index cards CG failed:', e); 
    if (retryCount < 3) {
      setTimeout(() => loadIndexCards(retryCount + 1), 10000);
    }
  }

  // 3. Fear & Greed (alternative.me — separate try/catch)
  try {
    const fgRes  = await fetch(`${API}/fng?limit=8`);
    const fgData = await fgRes.json();
    const score  = parseInt(fgData.data[0].value);
    const label  = fgData.data[0].value_classification;
    const yday   = parseInt(fgData.data[1].value);
    const lastWk = parseInt(fgData.data[7].value);
    document.getElementById('stat-fg-score').textContent = score;
    document.getElementById('stat-fg-label').textContent = label;
    document.getElementById('stat-fg-yday').textContent  = yday;
    document.getElementById('stat-fg-lastweek').textContent = lastWk;
    const deg = -90 + (score / 100) * 180;
    const needle = document.getElementById('fg-needle');
    if (needle) needle.setAttribute('transform', `rotate(${deg},60,65)`);
  } catch(_) {
    document.getElementById('stat-fg-score').textContent = '–';
    document.getElementById('stat-fg-label').textContent = 'Unavailable';
    document.getElementById('stat-fg-yday').textContent  = '–';
    document.getElementById('stat-fg-lastweek').textContent = '–';
  }
}
