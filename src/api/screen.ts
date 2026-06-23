// src/api/screen.ts
import type { PoolResponse, ScreenResponse } from "../types/screen";

// API base URL 解析優先序：
//   1. 執行期注入 window.__APP_CONFIG__.API_BASE_URL (Docker entrypoint 產生 /config.js)
//   2. 建置期 import.meta.env.VITE_API_BASE_URL
//   3. 預設 ""（同源）→ 走 nginx 反向代理 /api（正式環境）或 vite proxy（開發）
// 注意：空字串 "" 是合法值，代表「同源相對路徑」，不可 fallback 成 localhost。
declare global {
  interface Window {
    __APP_CONFIG__?: { API_BASE_URL?: string };
  }
}

function resolveBase(): string {
  const runtime =
    typeof window !== "undefined" ? window.__APP_CONFIG__?.API_BASE_URL : undefined;
  if (typeof runtime === "string") return runtime; // 尊重 ""（同源）
  const env = import.meta.env.VITE_API_BASE_URL;
  if (typeof env === "string") return env; // 尊重 ""（同源）
  return ""; // 同源
}

const BASE = resolveBase();

/** 對應後端 503「資料尚未備妥」，呼叫端可忽略並續輪詢 (非錯誤) */
export class NotReadyError extends Error {
  constructor(message = "資料準備中") {
    super(message);
    this.name = "NotReadyError";
  }
}

export interface ScreenParams {
  /** 只取前 N 名，0 = 全部 */
  top?: number;
}

/**
 * 取得最新起漲清單 (主端點)。
 * - 503 → 丟出 NotReadyError (呼叫端視為「稍後重試」)
 * - 其他非 2xx → 一般 Error
 */
export async function fetchScreen(
  params: ScreenParams = {},
  signal?: AbortSignal,
): Promise<ScreenResponse> {
  const q = new URLSearchParams();
  if (params.top != null) q.set("top", String(params.top));

  const res = await fetch(`${BASE}/api/screen?${q.toString()}`, { signal });
  if (res.status === 503) throw new NotReadyError();
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as ScreenResponse;
}

/** 取得第一層漲幅池 (除錯/備用) */
export async function fetchPool(
  params: { top?: number } = {},
  signal?: AbortSignal,
): Promise<PoolResponse> {
  const q = new URLSearchParams();
  if (params.top != null) q.set("top", String(params.top));

  const res = await fetch(`${BASE}/api/pool?${q.toString()}`, { signal });
  if (res.status === 503) throw new NotReadyError();
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as PoolResponse;
}

export { BASE as API_BASE_URL };
