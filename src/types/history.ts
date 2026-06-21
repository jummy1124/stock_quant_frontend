// src/types/history.ts
// 對應後端 GET /api/history/{symbol} 的穩定契約。
// 所有數值欄位都可能為 null（資料缺漏 / 均線視窗未滿），UI 需做 null 防護。

/** 單一交易日的日K（含後端算好的均線） */
export interface Candle {
  date: string; // 交易日 "YYYY-MM-DD"
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null; // 成交股數
  lots: number | null; // 成交量（張 = volume / 1000）
  change: number | null; // 漲跌價
  ma5: number | null; // 5 日均線；視窗未滿為 null
  ma20: number | null; // 20 日均線（月線）
  ma60: number | null; // 60 日均線（季線）
}

export interface HistoryResponse {
  symbol: string; // 股票代號
  market: string; // 市場中文 "上市" / "上櫃"
  market_code: string; // 市場代碼 "TWSE" / "TPEX"
  months: number; // 抓取月數
  count: number; // K 棒數（= candles.length）
  cached: boolean; // 是否命中後端 TTL 快取
  candles: Candle[]; // 時間升冪
}
