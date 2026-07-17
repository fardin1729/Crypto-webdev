/**
 * CoinVista — LSTM Price Prediction Engine
 * Runs inside a Blob Web Worker → main thread stays fully responsive.
 * ⚠️ For educational purposes only. Not financial advice.
 */

/* ─────────────────────────────────────────────────
   WORKER CODE  (runs in a background thread)
───────────────────────────────────────────────── */
const WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');

const LOOKBACK = 14;
const HORIZON  = 7;

function normalise(data) {
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  return { norm: data.map(v => (v - min) / rng), min, rng };
}
function denorm(v, min, rng) { return v * rng + min; }

function makeSequences(norm) {
  const X = [], y = [];
  for (let i = LOOKBACK; i < norm.length; i++) {
    X.push(norm.slice(i - LOOKBACK, i).map(v => [v]));
    y.push([norm[i]]);
  }
  return { X, y };
}

function buildModel() {
  const m = tf.sequential();
  m.add(tf.layers.lstm({ units: 20, inputShape: [LOOKBACK, 1], returnSequences: false }));
  m.add(tf.layers.dense({ units: 1 }));
  m.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError' });
  return m;
}

self.onmessage = async ({ data: { prices, dates, epochs, batch } }) => {
  try {
    post(8, 'Normalising data…');
    const { norm, min, rng } = normalise(prices);
    const { X, y } = makeSequences(norm);
    if (X.length < 5) throw new Error('Not enough historical data');

    const xs = tf.tensor3d(X);
    const ys = tf.tensor2d(y);

    post(12, 'Building LSTM model…');
    const model = buildModel();

    await model.fit(xs, ys, {
      epochs, batchSize: batch, validationSplit: 0.1, shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const pct = 12 + Math.round(((epoch + 1) / epochs) * 76);
          post(pct, 'Training LSTM Model... ' + Math.round(((epoch + 1) / epochs) * 100) + '%');
        }
      }
    });
    xs.dispose(); ys.dispose();

    post(90, 'Generating predictions…');
    let seq = norm.slice(-LOOKBACK).map(v => [v]);
    const futureNorm = [];
    for (let i = 0; i < HORIZON; i++) {
      const inp  = tf.tensor3d([seq]);
      const pred = model.predict(inp);
      const val  = pred.dataSync()[0];
      futureNorm.push(val);
      seq = [...seq.slice(1), [val]];
      inp.dispose(); pred.dispose();
    }
    model.dispose();

    const rawFuturePrices = futureNorm.map(v => denorm(v, min, rng));
    
    // Apply Exponential Moving Average (EMA) anchoring for visual smoothness
    let lastRealPrice = prices[prices.length - 1];
    const futurePrices = [];
    let prev = lastRealPrice;
    const alpha = 0.35; // Smoothing factor: higher = more responsive, lower = smoother
    
    for (let i = 0; i < rawFuturePrices.length; i++) {
      prev = alpha * rawFuturePrices[i] + (1 - alpha) * prev;
      futurePrices.push(prev);
    }

    const MS_DAY = 86400000;
    const lastDate = dates[dates.length - 1];
    const futureDates = Array.from({ length: HORIZON }, (_, i) => lastDate + MS_DAY * (i + 1));
    const lastPrices = prices.slice(-14);
    const std = Math.sqrt(lastPrices.reduce((s, v) => s + Math.pow(v - prices[prices.length - 1], 2), 0) / lastPrices.length);

    self.postMessage({ type: 'done', result: { prices, dates, futurePrices, futureDates, std } });
  } catch (err) {
    self.postMessage({ type: 'error', msg: err.message || 'Unknown error' });
  }
};

function post(pct, msg) { self.postMessage({ type: 'progress', pct, msg }); }
`;

/* ─────────────────────────────────────────────────
   MAIN THREAD  — spawns worker, bridges messages
───────────────────────────────────────────────── */
let activeWorker = null;

async function runLSTMPrediction(coinId, onProgress, onDone, onError, cachedPriceData) {
  // Kill any previous run
  if (activeWorker) { activeWorker.terminate(); activeWorker = null; }

  try {
    let rawPrices;
    if (cachedPriceData && cachedPriceData.length >= 40) {
      onProgress(5, 'Using cached price data…');
      rawPrices = cachedPriceData;
    } else {
      onProgress(2, 'Fetching 60-day price history…');
      const resp = await fetch(
        `${API}/coins/${coinId}/market_chart?vs_currency=usd&days=60`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { prices } = await resp.json();
      rawPrices = prices;
    }

    const prices = rawPrices.map(p => p[1]);
    const dates  = rawPrices.map(p => p[0]);

    onProgress(8, 'Starting background ML worker…');

    // Create Blob worker (works from file:// — no worker file path needed)
    const blob      = new Blob([WORKER_SRC], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker    = new Worker(workerUrl);
    activeWorker    = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress(data.pct, data.msg);
      } else if (data.type === 'done') {
        cleanup(workerUrl, worker);
        onDone(data.result);
      } else if (data.type === 'error') {
        cleanup(workerUrl, worker);
        onError(data.msg);
      }
    };

    worker.onerror = (e) => {
      cleanup(workerUrl, worker);
      // Blob workers may fail if browser blocks importScripts in Blob context
      onError('Worker failed: ' + (e.message || 'see browser console'));
    };

    worker.postMessage({ prices, dates, epochs: 15, batch: 16 });

  } catch (err) {
    onError(err.message || 'Unknown error');
  }
}

function cleanup(url, worker) {
  URL.revokeObjectURL(url);
  worker.terminate();
  activeWorker = null;
}
