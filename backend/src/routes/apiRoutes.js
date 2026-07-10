const express = require('express');
const router = express.Router();
const { fetchWithCache } = require('../utils/apiCache');
const { fetchNewsRSS } = require('../services/newsService');

/* ── CoinGecko Proxy Routes ── */
router.get('/global', async (req, res) => {
  try {
    const data = await fetchWithCache('https://api.coingecko.com/api/v3/global', 'global');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global data' });
  }
});

router.get('/coins/markets', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = await fetchWithCache(`https://api.coingecko.com/api/v3/coins/markets?${qs}`, `markets_${qs}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

router.get('/coins/:id/market_chart', async (req, res) => {
  try {
    const { id } = req.params;
    const qs = new URLSearchParams(req.query).toString();
    const data = await fetchWithCache(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?${qs}`, `chart_${id}_${qs}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

router.get('/search/trending', async (req, res) => {
  try {
    const data = await fetchWithCache('https://api.coingecko.com/api/v3/search/trending', 'trending');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending data' });
  }
});

router.get('/coins/list', async (req, res) => {
  try {
    const data = await fetchWithCache('https://api.coingecko.com/api/v3/coins/list', 'list');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coin list' });
  }
});

router.get('/news', async (req, res) => {
  try {
    const data = await fetchNewsRSS();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/* ── Alternative.me Proxy Route ── */
router.get('/fng', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = await fetchWithCache(`https://api.alternative.me/fng/?${qs}`, `fng_${qs}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fear and greed index' });
  }
});

module.exports = router;
