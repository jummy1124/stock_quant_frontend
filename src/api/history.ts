// src/api/history.ts
import { API_BASE_URL } from "./screen";
import type { HistoryResponse } from "../types/history";

export interface HistoryParams {
  /** 抓取月數，1~24，預設後端為 6 */
  months?: number;
  /** 市場代碼 "TWSE" / "TPEX"；省略則後端自動判別 */
  market?: string;
}

/**
 * 取得個股歷史日K（含 MA5/20/60）。
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

  const url = `${API_BASE_URL}/api/history/${encodeURIComponent(symbol)}?${q.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as HistoryResponse;
}
