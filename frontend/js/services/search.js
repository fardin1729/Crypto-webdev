/* ── Trending Ticker ── */
async function loadTrending() {
  try {
    const r=await fetch(`${API}/search/trending`);
    const {coins}=await r.json();
    const inner=document.getElementById('ticker-inner');
    const items=coins.map(({item:c})=>`
      <a href="coin.html?id=${c.id}" class="ticker-item">
        <img src="${c.small}" alt="${c.name}" loading="lazy"/>
        <span class="ticker-item-name">${c.name}</span>
        <span style="color:var(--text-muted);font-size:0.75rem">${c.symbol}</span>
        <span class="ticker-item-change ${(c.data?.price_change_percentage_24h?.usd||0)>=0?'positive':'negative'}">${fmtPct(c.data?.price_change_percentage_24h?.usd)}</span>
      </a>`).join('');
    inner.innerHTML=items+items;
  } catch(e) { document.getElementById('ticker-wrapper').style.display='none'; }
}

/* ── Search ── */
let searchListLoading = false;
async function loadSearchList() {
  if (searchListLoading || state.allCoins.length) return;
  searchListLoading = true;
  try {
    // Delay slightly so startup calls finish first
    await new Promise(r => setTimeout(r, 2000));
    const r = await fetch(`${API}/coins/list`);
    state.allCoins = await r.json();
  } catch(e) {}
  searchListLoading = false;
}
function handleSearch(query) {
  const dd=document.getElementById('search-dropdown');
  if(!query.trim()) { dd.classList.remove('open'); return; }
  const q=query.toLowerCase();
  
  let matches = state.allCoins.filter(c=>c.name.toLowerCase().includes(q)||c.symbol.toLowerCase().includes(q));
  
  // Sort matches by relevance so major assets (e.g. Bitcoin, BTC) float to the top
  matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aSym = a.symbol.toLowerCase();
    const bSym = b.symbol.toLowerCase();

    // 0. Exact ID match (e.g. 'bitcoin' matches the real Bitcoin ID)
    if (a.id === q && b.id !== q) return -1;
    if (b.id === q && a.id !== q) return 1;

    // 1. Exact symbol match
    if (aSym === q && bSym !== q) return -1;
    if (bSym === q && aSym !== q) return 1;

    // 2. Exact name match
    if (aName === q && bName !== q) return -1;
    if (bName === q && aName !== q) return 1;

    // 3. Symbol starts with query
    if (aSym.startsWith(q) && !bSym.startsWith(q)) return -1;
    if (bSym.startsWith(q) && !aSym.startsWith(q)) return 1;

    // 4. Name starts with query
    if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
    if (bName.startsWith(q) && !aName.startsWith(q)) return 1;

    // Fallback: Alphabetical order
    return aName.localeCompare(bName);
  });

  const results = matches.slice(0, 8);
  if(!results.length) { dd.innerHTML='<div class="search-empty">No results found</div>'; }
  else {
    dd.innerHTML=results.map(c=>`<div class="search-item" data-id="${c.id}">
      <span class="search-item-name">${c.name}</span>
      <span class="search-item-symbol">${c.symbol}</span>
    </div>`).join('');
    dd.querySelectorAll('.search-item').forEach(el=>{
      el.addEventListener('click',()=>{ window.location.href = `coin.html?id=${el.dataset.id}`; dd.classList.remove('open'); document.getElementById('search-input').value=''; });
    });
  }
  dd.classList.add('open');
}
