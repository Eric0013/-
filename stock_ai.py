import yfinance as yf
import pandas as pd
import pandas_ta as ta

def get_stock_analysis_report(symbol):

    df = yf.download(symbol, period="2y", auto_adjust=True)

    if df.empty:
        return None

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # 📊 技術指標
    df['RSI'] = ta.rsi(df['Close'], length=14)
    df['EMA_20'] = ta.ema(df['Close'], length=20)
    df['SMA_200'] = ta.sma(df['Close'], length=200)
    df.dropna(inplace=True)

    current_price = float(df['Close'].iloc[-1])

    # 🤖 簡單預測（先穩定，不用 LSTM）
    pred_price = float(df['Close'].rolling(5).mean().iloc[-1])

    change_pct = ((pred_price - current_price) / current_price) * 100

    # 🧠 AI 判斷邏輯
    signals = {
        "buffett": current_price < df['SMA_200'].iloc[-1] * 1.15,
        "livermore": current_price > df['EMA_20'].iloc[-1],
        "lynch": 50 < df['RSI'].iloc[-1] < 75,
        "wood": change_pct > 3,
        "simons": change_pct > 0.5
    }

    score = sum(signals.values())

    return {
        "symbol": symbol,
        "price": current_price,
        "predict": pred_price,
        "change": change_pct,
        "signals": signals,
        "score": score
    }