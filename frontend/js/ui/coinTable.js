/* ── Coin List ── */
async function loadCoins(retryCount = 0) {
  document.getElementById('table-loading').style.display = 'flex';
  document.getElementById('coins-table').style.display   = 'none';
  try {
    const activeTab = document.querySelector('.filter-tab.active')?.dataset.tab || 'all';
    const paramsObj = {
      vs_currency: state.currency,
      order: 'market_cap_desc',
      per_page: state.perPage,
      page: state.page,
      sparkline: true,
      price_change_percentage: '1h,24h,7d'
    };

    if (activeTab !== 'all') {
      const catMap = {
        defi: 'decentralized-finance-defi',
        layer1: 'smart-contract-platform',
        nft: 'non-fungible-tokens-nft',
        stablecoins: 'stablecoins'
      };
      if (catMap[activeTab]) {
        paramsObj.category = catMap[activeTab];
      }
    }

    const p = new URLSearchParams(paramsObj);
    const r = await fetch(`${API}/coins/markets?${p}`);
    if (!r.ok) throw new Error('Rate limited');
    state.coins = await r.json();
    renderTable();
  } catch(e) {
    const maxRetries = 3;
    const waitSec    = 20;
    if (retryCount < maxRetries) {
      let remaining = waitSec;
      const loadEl  = document.getElementById('table-loading');
      const tick = setInterval(() => {
        remaining--;
        loadEl.innerHTML = `
          <div style="text-align:center">
            <div style="font-size:2rem;margin-bottom:8px">⏳</div>
            <div style="color:var(--yellow);font-size:0.9rem;font-weight:600">API rate-limited — auto-retrying in ${remaining}s</div>
            <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">Attempt ${retryCount + 1} of ${maxRetries}</div>
          </div>`;
        if (remaining <= 0) {
          clearInterval(tick);
          loadCoins(retryCount + 1);
        }
      }, 1000);
    } else {
      document.getElementById('table-loading').innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:2rem;margin-bottom:8px">⚠️</div>
          <div style="color:var(--red);font-size:0.9rem;font-weight:600">Failed to load data after ${maxRetries} retries</div>
          <div style="color:var(--text-muted);font-size:0.8rem;margin:6px 0 16px">CoinGecko API is rate-limited. Please wait a minute.</div>
          <button onclick="loadCoins(0)" style="background:var(--primary);color:#fff;padding:8px 20px;border-radius:var(--radius);font-weight:600;font-size:0.875rem;cursor:pointer;border:none">
            🔄 Retry Now
          </button>
        </div>`;
    }
  }
}

/* ── Render Table ── */
function renderTable() {
  const tbody=document.getElementById('coins-tbody');
  tbody.innerHTML=state.coins.map((c,i)=>{
    const sp=c.max_supply?Math.min((c.circulating_supply/c.max_supply)*100,100):null;
    return `<tr class="fade-in" style="animation-delay:${i*0.03}s" data-id="${c.id}">
      <td><span class="rank-badge">${c.market_cap_rank||i+1}</span></td>
      <td><div class="coin-cell">
        <img class="coin-icon" src="${c.image}" alt="${c.name}" loading="lazy" onerror="this.src='https://placehold.co/36x36/7c3aed/fff?text=${(c.symbol && c.symbol[0] ? c.symbol[0] : 'C').toUpperCase()}'"/>
        <div class="coin-info"><span class="coin-name">${c.name}</span><span class="coin-symbol">${c.symbol}</span></div>
      </div></td>
      <td><strong>${fmt(c.current_price)}</strong></td>
      <td class="col-change1h">${pctPill(c.price_change_percentage_1h_in_currency)}</td>
      <td>${pctPill(c.price_change_percentage_24h_in_currency)}</td>
      <td class="col-change7d">${pctPill(c.price_change_percentage_7d_in_currency)}</td>
      <td>${fmt(c.market_cap)}</td>
      <td>${fmt(c.total_volume)}</td>
      <td><div class="supply-bar-wrap">
        <span>${c.circulating_supply?(c.circulating_supply/1e6).toFixed(2)+'M '+c.symbol.toUpperCase():'–'}</span>
        ${sp!==null?`<div class="supply-bar"><div class="supply-fill" style="width:${sp}%"></div></div>`:''}
      </div></td>
      <td class="col-chart"><canvas id="spark-${c.id}" class="mini-chart-canvas" width="100" height="40"></canvas></td>
    </tr>`;
  }).join('');
  document.getElementById('table-loading').style.display='none';
  document.getElementById('coins-table').style.display='table';
  state.coins.forEach(c=>{
    const cv=document.getElementById(`spark-${c.id}`);
    if(!cv) return;
    const data=c.sparkline_in_7d?.price||[];
    if(!data.length) return;
    drawSparkline(cv,data,c.price_change_percentage_7d_in_currency>=0?'#10b981':'#ef4444');
  });
  tbody.querySelectorAll('tr').forEach(row=>{
    row.addEventListener('click',()=>{ window.location.href = `coin.html?id=${row.dataset.id}`; });
  });
  renderPagination();
}

/* ── Pagination ── */
function renderPagination() {
  document.getElementById('btn-prev').disabled=state.page===1;
  const nums=document.getElementById('page-numbers');
  nums.innerHTML='';
  for(let i=Math.max(1,state.page-2);i<=Math.min(10,state.page+2);i++) {
    const b=document.createElement('button');
    b.className='page-num'+(i===state.page?' active':'');
    b.textContent=i;
    b.addEventListener('click',()=>{ state.page=i; loadCoins(); window.scrollTo({top:600,behavior:'smooth'}); });
    nums.appendChild(b);
  }
}
