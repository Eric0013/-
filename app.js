// app.js
const stocks = [
  { code: "2330", name: "台積電", score: 95, up: "+4.2%" },
  { code: "2454", name: "聯發科", score: 92, up: "+3.8%" },
  { code: "3017", name: "奇鋐", score: 90, up: "+3.4%" },
  { code: "3231", name: "緯創", score: 88, up: "+3.1%" },
  { code: "3661", name: "世芯", score: 87, up: "+2.9%" }
];

// 初始化跑馬燈
const slider = document.getElementById("slider-track");
if (slider) {
  const stockHTML = stocks.map(stock => `
    <div class="stock-card">
      <div class="stock-name">${stock.code}</div>
      <div>${stock.name}</div>
      <div class="stock-score">⭐ AI評分 ${stock.score}</div>
      <div class="stock-up">↑ ${stock.up}</div>
    </div>
  `).join("");
  slider.innerHTML = stockHTML + stockHTML;
}

async function analyzeStock() {
  const symbolInput = document.getElementById("symbol");
  const stockInfo = document.getElementById("stock-info");
  const stockResult = document.getElementById("stock-result");
  const aiResult = document.getElementById("ai-result");

  if (!symbolInput || !symbolInput.value.trim()) {
    alert("請輸入股票代碼！");
    return;
  }

  let symbol = symbolInput.value.trim().toUpperCase();

  // 自動補齊台股後綴
  if (/^\d+$/.test(symbol)) {
    symbol = symbol + ".TW";
  }

  if (stockInfo) stockInfo.classList.remove("hidden");
  if (stockResult) stockResult.innerHTML = `<strong>股票代碼：</strong> ${symbol}<br><br>📊 正在撈取 Yahoo Finance 數據...`;
  if (aiResult) aiResult.innerHTML = `🤖 AI 正在精算大師技術指標，請稍候...`;

  try {
    // 🔍 配合 Vercel 原生路由規範，不論本地或線上，直接打 /api/analyze 路由
    const apiUrl = "/api/analyze";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ symbol: symbol })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `伺服器回應錯誤 (代碼: ${response.status})`);
    }

    const data = await response.json();

    // 渲染價格資訊
    if (stockResult) {
      const priceColor = data.change >= 0 ? "#ef4444" : "#22c55e";
      const sign = data.change > 0 ? "+" : "";
      
      stockResult.innerHTML = `
        <div style="font-size: 1.1rem; line-height: 2;">
          <strong>股票代碼：</strong> <span style="color: #06b6d4;">${data.symbol}</span><br>
          <strong>目前收盤價：</strong> <span style="color: ${priceColor}; font-size: 1.4rem; font-weight: bold;">$${data.price}</span><br>
          <strong>預測價格 (5MA)：</strong> $${data.predict}<br>
          <strong>預期漲跌幅：</strong> <span style="color: ${priceColor};">${sign}${data.change}%</span>
        </div>
      `;
    }

    // 策略名稱中文化
    const nameMap = {
      buffett: "巴菲特價值投資 (股價 < 200SMA * 1.15)",
      livermore: "李佛摩趨勢動能 (股價 > 20EMA)",
      lynch: "彼得林區強勢增長 (50 < 14RSI < 75)",
      wood: "伍德科技創新 (5日均線乖離 > 3%)",
      simons: "西蒙斯量化微幅預測 (5日均線看漲)"
    };

    const signalDetails = Object.entries(data.signals)
      .map(([key, val]) => `
        <li style="margin-bottom: 8px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">
          <span>${nameMap[key] || key.toUpperCase()}</span>
          <span>${val ? '<span style="color:#22c55e; font-weight:bold;">✅ 符合</span>' : '<span style="color:#ef4444;">❌ 未符合</span>'}</span>
        </li>
      `).join("");

    if (aiResult) {
      aiResult.innerHTML = `
        <div style="font-size: 1.4rem; margin-bottom: 15px; color: #facc15; font-weight: bold; border-bottom: 2px solid #facc15; padding-bottom: 8px;">
          綜合 AI 評估得分： ${data.score} / 100 分
        </div>
        <ul style="list-style: none; padding-left: 0;">
          ${signalDetails}
        </ul>
      `;
    }

  } catch (error) {
    if (stockResult) stockResult.innerHTML = `<span style="color: #ef4444; font-weight: bold;">❌ 查詢失敗</span>`;
    if (aiResult) {
      aiResult.innerHTML = `
        <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">錯誤原因：${error.message}</div>
        <div style="font-size: 0.9rem; color: #94a3b8; line-height: 1.6;">
          💡 <strong>提示：</strong> 美股請輸入代碼 (如: AAPL)，台股直接打數字即可。若剛部署完畢，請重新整理網頁再試。
        </div>
      `;
    }
  }
}

// 事件監聽
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("button");
  const symbolInput = document.getElementById("symbol");

  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      analyzeStock();
    };
  }

  if (symbolInput) {
    symbolInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        analyzeStock();
      }
    });
  }
});