// api/analyze.js
export default async function handler(req, res) {
  // 處理 CORS 跨域與請求方法限制
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: '請輸入股票代碼' });
    }

    // 🌐 直接調用 Yahoo Finance 官方公開 API 抓取 2 年的歷史 K 線數據
    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;
    
    const yfResponse = await fetch(yfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!yfResponse.ok) {
      return res.status(404).json({ error: '查無此股票代碼，請確認格式（如台股 2330.TW）。' });
    }

    const json = await yfResponse.json();
    const result = json.chart.result?.[0];
    
    if (!result || !result.indicators.quote[0].close) {
      return res.status(404).json({ error: '該股票近期無交易數據。' });
    }

    // 數據清洗：過濾掉 null 與 undefined
    const rawCloses = result.indicators.quote[0].close || [];
    const closePrices = rawCloses.filter(price => price !== null && price !== undefined);

    if (closePrices.length < 200) {
      return res.status(400).json({ error: '歷史交易數據不足 200 天，無法計算巴菲特指標。' });
    }

    const totalDays = closePrices.length;
    const currentPrice = closePrices[totalDays - 1];

    // 📊 1. 計算 200日簡單移動平均 (SMA 200)
    const last200Days = closePrices.slice(totalDays - 200);
    const sma200 = last200Days.reduce((a, b) => a + b, 0) / 200;

    // 📊 2. 計算 20日指數移動平均 (EMA 20)
    let ema20 = closePrices[0];
    const k = 2 / (20 + 1);
    for (let i = 1; i < totalDays; i++) {
      ema20 = closePrices[i] * k + ema20 * (1 - k);
    }

    // 📊 3. 計算 14日相對強弱指標 (RSI 14)
    let gains = 0, losses = 0;
    for (let i = totalDays - 14; i < totalDays; i++) {
      const difference = closePrices[i] - closePrices[i - 1];
      if (difference > 0) gains += difference;
      else losses -= difference;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rsi14 = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

    // 🤖 5日均線預測與預期漲跌幅
    const last5Days = closePrices.slice(totalDays - 5);
    const predPrice = last5Days.reduce((a, b) => a + b, 0) / 5;
    const changePct = ((predPrice - currentPrice) / currentPrice) * 100;

    // 🧠 大師 AI 判斷邏輯
    const signals = {
      buffett: currentPrice < sma200 * 1.15,
      livermore: currentPrice > ema20,
      lynch: rsi14 > 50 && rsi14 < 75,
      wood: changePct > 3,
      simons: changePct > 0.5
    };

    const matchCount = Object.values(signals).filter(Boolean).length;
    const score = matchCount * 20;

    return res.status(200).json({
      symbol: symbol,
      price: Number(currentPrice.toFixed(2)),
      predict: Number(predPrice.toFixed(2)),
      change: Number(changePct.toFixed(2)),
      signals: signals,
      score: score
    });

  } catch (error) {
    return res.status(500).json({ error: '伺服器內部運算錯誤，請稍後再試。' });
  }
}