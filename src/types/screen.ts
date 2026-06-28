// src/types/screen.ts
// 後端穩定契約型別。所有 `number | null` 欄位都可能為 null (資料缺漏)，UI 需做 null 防護。

/** 共同中繼資訊，screen / pool / meta 端點都帶這塊 */
export interface Meta {
  /** 本份資料產生時間 ISO8601，例如 "2026-06-12T11:30:00"；無資料時 null */
  generated_at: string | null;
  /** 資料距今幾秒，可用來顯示「N 秒前更新」 */
  age_seconds: number | null;
  /** "live" = 盤中即時 / "eod" = 最後交易日收盤 */
  source: "live" | "eod" | null;
  /** 全市場掃描檔數 */
  universe: number;
  /** 實際可算漲幅檔數 */
  quotable: number;
  /** 通過第一層漲幅池的檔數 */
  pool_size: number;
  /** 本次回傳筆數 (= results.length) */
  count: number;
  /** 即時報價限流/失敗摘要，正常為 null */
  warning: string | null;
  /** 後端最後一次錯誤，正常為 null */
  last_error: string | null;
}

/** 個股基礎欄位，作為 BreakoutRow 的基底 */
export interface StockRow {
  symbol: string; // 股票代號，例如 "2330"
  name: string; // 股票名稱，例如 "台積電" (可能為空字串)
  market: string; // 市場中文 "上市" / "上櫃" (可能為空字串)
  market_code: string; // 市場代碼 "TWSE" / "TPEX" (可能為空字串)
  close: number | null; // 現價 / 收盤
  prev_close: number | null; // 昨收
  change: number | null; // 漲跌價 = close - prev_close
  change_pct: number | null; // 漲幅% = (close - prev_close) / prev_close × 100
  volume: number | null; // 成交股數 (單位：股)
  lots: number | null; // 成交量 (單位：張 = volume / 1000)
  open: number | null;
  high: number | null;
  low: number | null;
}

/** 起漲個股 (/api/screen 的 results 元素)，在 StockRow 上多了篩選明細 */
export interface BreakoutRow extends StockRow {
  prev_high: number | null; // 昨日最高 (條件2 突破基準)
  vol_ratio: number | null; // 當日量 / 昨量
  ma5: number | null; // 五日均價
  ma20: number | null; // 月均線 (20MA)
  ma20_up: boolean; // 月均線是否上彎
}

export interface ScreenResponse {
  meta: Meta;
  results: BreakoutRow[];
}

/**
 * 使用者可調的篩選參數 (對應後端 /api/screen 的 query)。
 * 預設值見 DEFAULT_SETTINGS（與原專案設定一致）；後端 /api/screen-defaults 為單一真實來源。
 */
export interface ScreenSettings {
  // 第一層 漲幅池
  min_change: number; // 漲幅下限 %
  exclude_limit_up: boolean; // 排除已鎖漲停 (收盤 ≤ 漲停前一檔)
  // 第二層 起漲點 6 條件
  vol_ratio: number; // 條件3 當日量/昨量下限
  ma_short: number; // 5MA 天數
  ma_mid: number; // 月均線天數
  ma_slope_lookback: number; // 月線上彎回看天數
  vol_projection: boolean; // 條件3 是否用全日預估量
}

/** 原專案預設值（後端首次載入或離線時的後備；以 /api/screen-defaults 為準） */
export const DEFAULT_SETTINGS: ScreenSettings = {
  min_change: 3.0,
  exclude_limit_up: true,
  vol_ratio: 1.2,
  ma_short: 5,
  ma_mid: 20,
  ma_slope_lookback: 5,
  vol_projection: false,
};
