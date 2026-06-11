# api/index.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd

app = Flask(__name__)
# 開啟全域 CORS 跨域支援
CORS(app, resources={r"/*": {"origins": "*", "methods": ["POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

def get_stock_analysis_report(symbol):
    try:
        df = yf.download(symbol, period="2y", auto_adjust=True)
        if df is None or df.empty:
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # 📊 純 pandas 技術指標計算
        df['SMA_200'] = df['Close'].rolling(window=200).mean()
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))

        df.dropna(inplace=True)
        if df.empty:
            return None

        current_price = float(df['Close'].iloc[-1])
        pred_price = float(df['Close'].rolling(5).mean().iloc[-1])
        change_pct = ((pred_price - current_price) / current_price) * 100

        signals = {
            "buffett": bool(current_price < df['SMA_200'].iloc[-1] * 1.15),
            "livermore": bool(current_price > df['EMA_20'].iloc[-1]),
            "lynch": bool(50 < df['RSI'].iloc[-1] < 75),
            "wood": bool(change_pct > 3),
            "simons": bool(change_pct > 0.5)
        }

        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "predict": round(pred_price, 2),
            "change": round(change_pct, 2),
            "signals": signals,
            "score": int(sum(signals.values()) * 20)
        }
    except Exception as e:
        return None

# 💡 關鍵修正：Vercel 預設會把 /api 掛載為基礎路徑，這裡明確宣告指定 /api/analyze 接收 POST
@app.route("/api/analyze", methods=["POST", "OPTIONS"])
def handle_analyze():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    data = request.json or {}
    symbol = data.get("symbol")
    
    if not symbol:
        return jsonify({"error": "請輸入股票代碼"}), 400

    result = get_stock_analysis_report(symbol)
    if result is None:
        return jsonify({"error": "查無此股票代碼，或近期無交易數據。格式範例：美股 NVDA、台股 2330.TW"}), 404

    return jsonify(result)

# 暴露給 Vercel 核心
app.debug = False
app.testing = False
app = app