/* CoinVista — Main Init */

/* ── View Switcher ── */
function switchView(view) {
  state.currentView=view;
  const isMkt=view==='markets';
  document.getElementById('hero').style.display=isMkt?'':'none';
  document.getElementById('ticker-wrapper').style.display=isMkt?'':'none';
  document.getElementById('main-content').style.display=isMkt?'':'none';
  document.getElementById('news-section').style.display=isMkt?'none':'';
  document.querySelectorAll('.nav-link[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===view));
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='news'&&!state.newsFetched) loadNews();
}

/* ── Init ── */
async function init() {
  applyTheme(state.theme);

  // Interactive mouse parallax for motion background
  let ticking = false;
  window.addEventListener('mousemove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const mx = (e.clientX - window.innerWidth / 2) * 0.02;
        const my = (e.clientY - window.innerHeight / 2) * 0.02;
        document.documentElement.style.setProperty('--mx', mx.toFixed(1));
        document.documentElement.style.setProperty('--my', my.toFixed(1));
        ticking = false;
      });
      ticking = true;
    }
  });
  window.addEventListener('scroll',()=>document.getElementById('navbar').classList.toggle('scrolled',window.scrollY>20));

  document.getElementById('hamburger').addEventListener('click',()=>document.getElementById('nav-links').classList.toggle('open'));
  document.getElementById('btn-explore').addEventListener('click',()=>document.getElementById('main-content').scrollIntoView({behavior:'smooth'}));
  document.getElementById('btn-trending').addEventListener('click',()=>document.getElementById('ticker-wrapper').scrollIntoView({behavior:'smooth'}));
  
  document.getElementById('currency-select').addEventListener('change',e=>{ state.currency=e.target.value; state.page=1; loadCoins(); });
  document.getElementById('perpage-select').addEventListener('change',e=>{ state.perPage=parseInt(e.target.value); state.page=1; loadCoins(); });
  document.getElementById('btn-prev').addEventListener('click',()=>{ if(state.page>1){state.page--;loadCoins();window.scrollTo({top:600,behavior:'smooth'});} });
  document.getElementById('btn-next').addEventListener('click',()=>{ state.page++;loadCoins();window.scrollTo({top:600,behavior:'smooth'}); });
  document.getElementById('modal-close').addEventListener('click',closeModal);
  document.getElementById('modal-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

  const si=document.getElementById('search-input');
  if (si) {
    si.addEventListener('input',e=>{ clearTimeout(state.searchDebounce); state.searchDebounce=setTimeout(()=>handleSearch(e.target.value),250); });
    // Lazy-load coin list only when user actually uses search (saves rate limit slots)
    si.addEventListener('focus',()=>{
      loadSearchList(); // no-op if already loaded
      if(si.value) document.getElementById('search-dropdown').classList.add('open');
    });
    document.addEventListener('click',e=>{ if(!e.target.closest('#search-wrapper')) { const dd = document.getElementById('search-dropdown'); if(dd) dd.classList.remove('open'); } });
  }

  document.querySelectorAll('.filter-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{ document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active'); state.page=1; loadCoins(); });
  });

  // Nav view switching
  document.querySelectorAll('.nav-link[data-view]').forEach(link=>{
    link.addEventListener('click',e=>{ e.preventDefault(); switchView(link.dataset.view); document.getElementById('nav-links').classList.remove('open'); });
  });

  // News category filters
  document.querySelectorAll('.news-filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ document.querySelectorAll('.news-filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); loadNews(btn.dataset.cat); });
  });

  document.getElementById('btn-load-more').addEventListener('click',()=>{ state.newsPage++; renderNews(); });

  // ── LSTM Prediction button ──
  document.getElementById('btn-run-predict').addEventListener('click', () => {
    if (!currentModalCoinId) return;
    const btn     = document.getElementById('btn-run-predict');
    const working = document.getElementById('predict-working');
    const result  = document.getElementById('predict-result');
    const errEl   = document.getElementById('predict-error');
    const fill    = document.getElementById('predict-fill');
    const label   = document.getElementById('predict-label');
    const stats   = document.getElementById('predict-stats');

    btn.disabled = true;
    btn.textContent = 'Training…';
    working.style.display = '';
    result.style.display  = 'none';
    errEl.style.display   = 'none';
    if (predictChart) { predictChart.destroy(); predictChart = null; }

    runLSTMPrediction(
      currentModalCoinId,
      /* onProgress */ (pct, msg) => {
        fill.style.width  = pct + '%';
        label.textContent = msg;
      },
      /* onDone */ ({ prices, dates, futurePrices, futureDates, std }) => {
        working.style.display = 'none';
        result.style.display  = '';
        btn.textContent = '🔄 Re-run';
        btn.disabled    = false;

        const lastPrice = prices[prices.length - 1];
        const pred7     = futurePrices[6]  ?? futurePrices[futurePrices.length - 1];
        const pred14    = futurePrices[13] ?? futurePrices[futurePrices.length - 1];
        const chg7  = ((pred7  - lastPrice) / lastPrice) * 100;
        const chg14 = ((pred14 - lastPrice) / lastPrice) * 100;

        const statCard = (label, value, cls='') =>
          `<div class="predict-stat"><div class="predict-stat-label">${label}</div><div class="predict-stat-value ${cls}">${value}</div></div>`;

        stats.innerHTML =
          statCard('Current Price', fmt(lastPrice)) +
          statCard('Predicted 7d',  fmt(pred7),  chg7  >= 0 ? 'up' : 'down') +
          statCard('7d Change',     (chg7  >= 0 ? '+' : '') + chg7.toFixed(2)  + '%', chg7  >= 0 ? 'up' : 'down') +
          statCard('Predicted 14d', fmt(pred14), chg14 >= 0 ? 'up' : 'down') +
          statCard('14d Change',    (chg14 >= 0 ? '+' : '') + chg14.toFixed(2) + '%', chg14 >= 0 ? 'up' : 'down') +
          statCard('Trend', chg14 >= 0 ? '📈 Bullish' : '📉 Bearish', chg14 >= 0 ? 'up' : 'down');

        // Build combined chart
        const histLabels   = dates.slice(-60).map(d => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
        const histPrices   = prices.slice(-60);
        const futureLabels = futureDates.map(d => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}));

        const allLabels = [...histLabels, ...futureLabels];
        const histData  = [...histPrices, ...Array(futureLabels.length).fill(null)];
        const predData  = [...Array(histLabels.length - 1).fill(null), histPrices[histPrices.length - 1], ...futurePrices];
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
              { label: 'LSTM Forecast', data: predData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', borderWidth: 2, borderDash: [6,3], pointRadius: 3, pointBackgroundColor: '#06b6d4', tension: 0.4, fill: true },
              { label: 'Upper Band', data: upperBand, borderColor: 'rgba(6,182,212,0.2)', borderWidth: 1, borderDash: [3,3], pointRadius: 0, fill: false },
              { label: 'Lower Band', data: lowerBand, borderColor: 'rgba(6,182,212,0.2)', borderWidth: 1, borderDash: [3,3], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(6,182,212,0.05)' },
            ],
          },
          options: {
            responsive: true,
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
        errEl.style.display   = '';
        errEl.textContent     = '⚠️ Prediction failed: ' + msg;
        btn.disabled  = false;
        btn.textContent = 'Retry Prediction';
      },
      state.modalPriceData   // ← cached 120-day data, no extra fetch needed
    );
  });

  // ── Index Card Clicks ──
  document.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.index;
      if (!type) return;
      window.location.href = `index-detail.html?type=${type}`;
    });
  });

  document.getElementById('index-modal-close').addEventListener('click', closeModal);



  // Stagger startup API calls to avoid CoinGecko rate limiting
  await loadIndexCards();
  loadTrending(); // non-critical, fire and forget
  await new Promise(r => setTimeout(r, 300));
  await loadCoins();
  setInterval(()=>{ loadIndexCards(); loadCoins(); }, 60000);
}

document.addEventListener('DOMContentLoaded',init);
