/* ── News ── */
function getSentiment(title,body) {
  const text=(title+' '+body).toLowerCase();
  const pos=['surge','rally','gain','bull','rise','record','growth','adoption','soar','breakout','profit','launch','milestone','jump','spike','recover'];
  const neg=['crash','drop','fall','bear','hack','scam','ban','plunge','decline','loss','warning','risk','fraud','lawsuit','dump','collapse'];
  const pc=pos.filter(w=>text.includes(w)).length;
  const nc=neg.filter(w=>text.includes(w)).length;
  if(pc>nc) return {label:'▲ Bullish',cls:'positive'};
  if(nc>pc) return {label:'▼ Bearish',cls:'negative'};
  return {label:'● Neutral',cls:'neutral'};
}

async function loadNews(category=state.newsCategory) {
  state.newsCategory=category;
  const loading=document.getElementById('news-loading');
  const grid=document.getElementById('news-grid');
  const loadMore=document.getElementById('news-load-more');
  loading.style.display='flex'; grid.innerHTML=''; loadMore.style.display='none';
  try {
    const r=await fetch(`${NEWS_API}?page=1`);
    if(!r.ok) throw new Error(`API error ${r.status}`);
    const data=await r.json();
    let articles=(data.data||data||[]);
    if(!Array.isArray(articles)||!articles.length) throw new Error('No articles returned');
    if(category!=='ALL') {
      const kw={BTC:['bitcoin','btc'],ETH:['ethereum','eth'],DEFI:['defi','yield','liquidity'],NFT:['nft','metaverse','gaming']}[category]||[category.toLowerCase()];
      articles=articles.filter(a=>{ const t=(a.title+' '+(a.description||'')).toLowerCase(); return kw.some(k=>t.includes(k)); });
    }
    if(!articles.length) {
      loading.style.display='none';
      grid.innerHTML='<div class="news-error" style="grid-column:1/-1"><div style="font-size:2rem;margin-bottom:8px">🔍</div><h3>No articles found</h3><p>Try selecting "All" category.</p></div>';
      return;
    }
    state.news=articles; state.newsPage=1; state.newsFetched=true;
    loading.style.display='none';
    renderNews();
  } catch(e) {
    loading.style.display='none';
    grid.innerHTML=`<div class="news-error" style="grid-column:1/-1">
      <div style="font-size:2.5rem;margin-bottom:12px">📡</div>
      <h3>Couldn't load news</h3>
      <p>Please check your internet connection.</p>
      <p style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">${e.message}</p>
      <button class="btn-load-more" style="margin-top:16px" onclick="state.newsFetched=false;loadNews()">Retry</button>
    </div>`;
  }
}

function renderNews() {
  const grid=document.getElementById('news-grid');
  const loadMore=document.getElementById('news-load-more');
  const perPage=12;
  const slice=state.news.slice(0,state.newsPage*perPage);
  grid.innerHTML=slice.map((a,i)=>{
    const title=a.title||'';
    const body=a.description||a.body||'';
    const sent=getSentiment(title,body);
    const emoji=NEWS_EMOJIS[i%NEWS_EMOJIS.length];
    const imgUrl=a.thumb_2x||a.imageurl||'';
    const hasImg=imgUrl&&imgUrl.startsWith('http')&&!imgUrl.includes('placeholder');
    const rawDate=a.published_at||a.pubDate||(a.published_on?a.published_on*1000:null);
    const pubTime=rawDate?timeAgo(rawDate):'';
    const source=a.news_site||a.source_info?.name||a.source||'Crypto News';
    const col=SOURCE_COLORS[(source||'').toLowerCase().replace(/[^a-z]/g,'')]||'#7c3aed';
    const tags=[];
    const safeUrl=(a.url||'#').replace(/'/g,'%27');
    return `<div class="news-card fade-in" style="animation-delay:${(i%perPage)*0.04}s" onclick="window.open('${safeUrl}','_blank','noopener')">
      ${hasImg
        ?`<img class="news-card-img" src="${imgUrl}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div class="news-card-img-placeholder" style="display:none">${emoji}</div>`
        :`<div class="news-card-img-placeholder">${emoji}</div>`}
      <div class="news-card-body">
        <div class="news-card-meta">
          <span class="news-source-badge" style="background:${col}22;border-color:${col}55;color:${col}">
            ${a.source_info?.img?`<img class="news-source-icon" src="${a.source_info.img}" alt="" onerror="this.style.display='none'"/>`:''}
            ${source}
          </span>
          <span class="news-time">${pubTime}</span>
        </div>
        <div class="news-card-title">${a.title}</div>
        ${tags.length?`<div class="news-card-tags">${tags.map(t=>`<span class="news-tag">${t.trim()}</span>`).join('')}</div>`:''}
      </div>
      <div class="news-card-footer">
        <span class="news-read-more">Read Article
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="news-sentiment ${sent.cls}">${sent.label}</span>
      </div>
    </div>`;
  }).join('');
  loadMore.style.display=state.news.length>state.newsPage*perPage?'flex':'none';
}
