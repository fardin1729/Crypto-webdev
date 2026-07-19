# CoinVista: Intelligent Cryptocurrency Dashboard

![CoinVista](https://img.shields.io/badge/Status-Active-brightgreen) ![Tech Stack](https://img.shields.io/badge/Stack-Vanilla_JS_|_Node.js_|_TensorFlow.js-blue)

CoinVista is a modern, high-performance cryptocurrency market dashboard that aggregates live data for over 10,000+ assets. Built with a focus on speed and premium UI/UX, CoinVista utilizes a custom Node.js caching proxy to bypass strict API rate limits and leverages in-browser Machine Learning (LSTM) to predict future price trends entirely on the client side.

## 🚀 Key Features

- **Live Market Data:** Real-time integration with CoinGecko for instant price, volume, and market cap updates.
- **In-Browser ML Predictions:** Built-in Long Short-Term Memory (LSTM) neural networks running via TensorFlow.js in background Web Workers to forecast 7-day price movements.
- **Market Psychology:** Integrates the live "Fear & Greed Index" to quantify market sentiment.
- **Interactive Visualizations:** Highly responsive sparkline and detailed historical charts powered by Chart.js.
- **Smart News Aggregation:** Pulls and categorizes the latest cryptocurrency news directly from RSS feeds.
- **Custom Indices:** Proprietary "Altcoin Season" and "Vista20" indices to track capital rotation in the crypto markets.
- **Zero-Framework Frontend:** Built entirely with highly optimized Vanilla HTML/CSS/JS, eliminating framework bloat.

## 🛠️ Technology Stack

**Frontend**
- HTML5 / CSS3 (CSS Grid, Flexbox, Custom Variables, Dark Mode)
- Vanilla JavaScript (ES6+)
- TensorFlow.js (Machine Learning)
- Chart.js (Data Visualization)

**Backend**
- Node.js & Express.js
- Axios (API requests)
- rss-parser (News aggregation)
- Custom In-Memory & File-based Caching

## ⚙️ Local Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/coinvista.git
   cd coinvista
   ```

2. **Install Backend Dependencies**
   Navigate to the backend folder and install the required npm packages.
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables (Optional but Recommended)**
   Create a `.env` file inside the `backend` folder and add your free CoinGecko Demo API key to bypass shared-IP rate limits (crucial for cloud deployments).
   ```env
   PORT=5000
   COINGECKO_API_KEY=your_free_coingecko_key_here
   ```

4. **Start the Server**
   Run the Express server. It will automatically serve the frontend files.
   ```bash
   node server.js
   ```

5. **View the App**
   Open your browser and navigate to `http://localhost:5000`.

## 🧠 Why TensorFlow.js?
Instead of relying on expensive backend servers for Python-based ML inference, CoinVista compiles and runs its LSTM model directly in the user's browser. By delegating the mathematical computations to asynchronous Web Workers, the dashboard remains completely fluid and interactive while the model trains and generates predictions in the background.

## 🛡️ Architecture & Caching
To prevent `429 Too Many Requests` errors from free public APIs, the Express.js backend acts as a secure proxy. When a user requests data, the backend checks a localized cache. If the data is fresh (under 5 minutes old), it serves it instantly. If expired, it securely fetches new data using the protected API keys, significantly reducing the outbound request load.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open source and available under the [MIT License](LICENSE).
