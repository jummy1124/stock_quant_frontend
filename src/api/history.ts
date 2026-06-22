// src/api/history.ts
import { API_BASE_URL } from "./screen";
import type { HistoryResponse, QuoteResponse } from "../types/history";

export interface HistoryParams {
  /** 抓取月數，1~24，預設後端為 6 */
  months?: number;
  /** 市場代碼 "TWSE" / "TPEX"；省略則後端自動判別 */
  market?: string;
  /** 是否把今日盤中即時價接到日K尾端（交易時間有效） */
  intraday?: boolean;
}

/**
 * 取得個股歷史日K（含 MA5/20/60）。
 * intraday=true 時，末根為今日盤中即時K（之後可用 fetchQuote 輪詢更新）。
 * 後端查無資料時回 200 + candles=[]（非錯誤）；502 → 一般 Error。
 */
export async function fetchHistory(
  symbol: string,
  params: HistoryParams = {},
  signal?: AbortSignal,
): Promise<HistoryResponse> {
  const q = new URLSearchParams();
  if (params.months != null) q.set("months", String(params.months));
  if (params.market) q.set("market", params.market);
  if (params.intraday) q.set("intraday", "true");

  const url = `${API_BASE_URL}/api/history/${encodeURIComponent(symbol)}?${q.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as HistoryResponse;
}

/**
 * 取得個股盤中最新價（單檔），給歷史圖表輪詢更新「今日K + 現價線」用。
 * 交易時間回即時價（source=live）；非交易時間回最後成交價（source=eod）。
 */
export async function fetchQuote(
  symbol: string,
  market?: string,
  signal?: AbortSignal,
): Promise<QuoteResponse> {
  const q = new URLSearchParams();
  if (market) q.set("market", market);

  const url = `${API_BASE_URL}/api/quote/${encodeURIComponent(symbol)}?${q.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as QuoteResponse;
}
