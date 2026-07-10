const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent']
    ]
  }
});
const { cache, saveCacheToDisk, CACHE_TTL } = require('../utils/apiCache');

function extractImage(item) {
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
    return item.mediaContent.$.url;
  }
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  const match = (item.content || item.description || '').match(/<img[^>]+src="([^">]+)"/i);
  if (match) return match[1];
  return null;
}

async function fetchNewsRSS() {
  const key = 'news_rss';
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    console.log('Fetching news RSS feeds...');
    const feeds = [
      { url: 'https://cointelegraph.com/feed', name: 'Cointelegraph' },
      { url: 'https://decrypt.co/feed', name: 'Decrypt' },
      { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml', name: 'CoinDesk' }
    ];

    const results = await Promise.allSettled(
      feeds.map(async (f) => {
        const feed = await parser.parseURL(f.url);
        return feed.items.map(item => ({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          url: item.link,
          published_at: (item.pubDate && !isNaN(Date.parse(item.pubDate))) ? new Date(item.pubDate).getTime() : Date.now(),
          news_site: f.name,
          thumb_2x: extractImage(item)
        }));
      })
    );

    let allArticles = [];
    results.forEach(res => {
      if (res.status === 'fulfilled') {
        allArticles = allArticles.concat(res.value);
      } else {
        console.error('Error fetching feed:', res.reason.message);
      }
    });

    allArticles.sort((a, b) => b.published_at - a.published_at);
    allArticles = allArticles.slice(0, 60);

    const formattedData = { data: allArticles };
    cache.set(key, { data: formattedData, timestamp: Date.now() });
    saveCacheToDisk();
    return formattedData;
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error.message);
    if (cache.has(key)) {
      console.log('Serving stale news cache due to RSS error.');
      return cache.get(key).data;
    }
    throw error;
  }
}

module.exports = { fetchNewsRSS };
