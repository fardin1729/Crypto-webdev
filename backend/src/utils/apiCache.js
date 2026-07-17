const path = require('path');
const fs = require('fs');
const axios = require('axios');

const CACHE_FILE = path.join(__dirname, '../../data/cache.json');
let cache = new Map();

if (fs.existsSync(CACHE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    cache = new Map(Object.entries(data));
    console.log('Loaded persistent cache from disk');
  } catch(e) { console.error('Failed to load cache.json'); }
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function saveCacheToDisk() {
  const obj = Object.fromEntries(cache);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), 'utf8');
}

async function fetchWithCache(url, key) {
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }
  
  try {
    console.log('Fetching from API:', url);
    const headers = { 'Accept': 'application/json', 'User-Agent': 'CoinVista/1.0' };
    if (process.env.COINGECKO_API_KEY && url.includes('coingecko.com')) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }
    
    const response = await axios.get(url, { headers });
    
    cache.set(key, { data: response.data, timestamp: Date.now() });
    saveCacheToDisk();
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(`RATE LIMIT HIT (429) for ${key}.`);
    } else {
      console.error(`API Error for ${key}:`, error.message);
    }
    
    if (cache.has(key)) {
      console.log(`Serving stale cache for ${key} due to API error.`);
      return cache.get(key).data;
    }
    throw error;
  }
}

module.exports = { fetchWithCache, cache, saveCacheToDisk, CACHE_TTL };
