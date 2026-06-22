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
  intraday?: boolean; // 末根是否為今日盤中即時K（intraday=true 查詢時）
  source?: string | null; // "live" 盤中即時 / "eod" 非交易時間
  as_of?: string | null; // 盤中K取得時間 ISO8601
  candles: Candle[]; // 時間升冪
}

/** 盤中即時報價回傳的「今日一根」，沒有均線欄位（合併到圖表時沿用歷史的 MA）。 */
export interface LiveCandle {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  lots: number | null;
  change: number | null;
}

/** 對應後端 GET /api/quote/{symbol}：單檔盤中最新價，給圖表輪詢更新用。 */
export interface QuoteResponse {
  symbol: string;
  market: string;
  market_code: string;
  trading: boolean; // 目前是否為交易時間（09:00-13:30 週一至五）
  source: string | null; // "live" / "eod"
  as_of: string | null; // 報價取得時間 ISO8601
  prev_close: number | null; // 昨收
  close: number | null; // 現價 / 最新成交價
  change: number | null; // 漲跌價
  change_pct: number | null; // 漲幅%
  candle: LiveCandle | null; // 今日（或最後交易日）一根，可接到日K尾端
}
