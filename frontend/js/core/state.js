const API = 'http://localhost:5000/api';
const NEWS_API = `${API}/news`;
const CURRENCY_SYMBOLS = { usd: '$', eur: '€', btc: '₿', eth: 'Ξ' };
const NEWS_EMOJIS = ['📰','💹','🪙','🔗','🌐','📊','💰','🚀','⚡','🔐'];
const SOURCE_COLORS = {
  coindesk:'#ff6b35', cointelegraph:'#1da462', decrypt:'#6c5ce7',
  theblock:'#3b82f6', cryptoslate:'#8b5cf6', bitcoinist:'#f59e0b',
  newsbtc:'#ef4444', ambcrypto:'#06b6d4',
};

let deviceId = localStorage.getItem('cv_deviceId');
if (!deviceId) {
  deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('cv_deviceId', deviceId);
}

let state = {
  deviceId: deviceId,
  coins:[], page:1, perPage:100, currency:'usd',
  theme: 'light',
  allCoins:[], searchDebounce:null,
  currentView:'markets',
  news:[], newsPage:1, newsCategory:'ALL', newsFetched:false,
  modalPriceData: [],
};
