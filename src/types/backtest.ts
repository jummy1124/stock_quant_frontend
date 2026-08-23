// src/types/backtest.ts
// 回測頁的資料型別，與後端 /backtestapi 契約一一對應（欄位維持 snake_case，
// 直接就是 JSON 的形狀，避免多一層無意義的轉名）。

/** 進出場價的取法。兩者都以「收盤價」出場，差別在進場。 */
export type BacktestMode =
  /** 進場 = 盤中 13:00 快照價；出場 = 第 N 個交易日收盤價（N 可為 0 = 當日收盤） */
  | "intraday_to_close"
  /** 進場 = 收盤快照的收盤價；出場 = 第 N 個交易日收盤價（N ≥ 1） */
  | "close_to_close";

export const BACKTEST_MODES: BacktestMode[] = [
  "intraday_to_close",
  "close_to_close",
];

/** 一鍵可選的持有天數。刻意只留三個常用值，其餘由輸入欄自由指定 ——
 *  一整排按鈕看起來像「只能選這些」，反而把真正的彈性藏起來了。 */
export const HORIZON_PRESETS = [1, 5, 10] as const;

/** 與後端 app/backtest.py 的護欄一致，讓不合法的 N 在送出前就被擋下並說明原因。 */
export const MAX_HORIZON = 120;
export const MAX_HORIZONS = 16;

export interface HorizonStat {
  n: number;
  /** 進出場價都齊全、真的算得出報酬的筆數 */
  samples: number;
  /** 因為缺價（尚未經過 N 天、或該日收盤價未回補）而未列入統計的筆數 */
  missing: number;
  wins: number;
  losses: number;
  flat: number;
  /** wins / samples，0~1；samples = 0 時為 null（不是 0） */
  win_rate: number | null;
  avg_return_pct: number | null;
  median_return_pct: number | null;
  best_return_pct: number | null;
  worst_return_pct: number | null;
}

export interface BacktestDetailRow {
  trade_date: string; // YYYY-MM-DD
  symbol: string;
  name: string;
  market: string;
  market_code: string;
  entry_price: number;
  exit_date: string;
  exit_price: number;
  change: number;
  return_pct: number;
}

export interface BacktestResult {
  mode: BacktestMode;
  session: string;
  start: string;
  end: string;
  horizons: number[];
  entries: number;
  trading_days: number;
  summary: HorizonStat[];
  detail_n: number;
  detail_total: number;
  detail: BacktestDetailRow[];
  warning: string | null;
}

export interface CoverageRange {
  min_date: string | null;
  max_date: string | null;
  trading_days: number;
}

export interface BacktestCoverage {
  snapshots: CoverageRange & { total_snapshots: number };
  prices: CoverageRange & { total_rows: number; symbols: number };
}

export interface BacktestQuery {
  mode: BacktestMode;
  start: string;
  end: string;
  horizons: number[];
  detail_n: number;
}
