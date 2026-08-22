// src/api/backtest.ts
// 回測 API client。與 api/screen.ts 相同的 base URL 解析規則（執行期 config.js →
// 建置期 env → 同源相對路徑），因此正式環境走 nginx 反向代理、開發走 vite proxy。
import type {
  BacktestCoverage,
  BacktestQuery,
  BacktestResult,
} from "../types/backtest";

function resolveBase(): string {
  const runtime =
    typeof window !== "undefined" ? window.__APP_CONFIG__?.API_BASE_URL : undefined;
  if (typeof runtime === "string") return runtime; // 尊重 ""（同源）
  const env = import.meta.env.VITE_API_BASE_URL;
  if (typeof env === "string") return env;
  return "";
}

const BASE = resolveBase();

/** 後端回 422 時把它的 detail 訊息帶出來 —— 那是給使用者看的中文說明。 */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    /* 不是 JSON，退回狀態碼 */
  }
  return `HTTP ${res.status}`;
}

function buildQuery(q: BacktestQuery): URLSearchParams {
  return new URLSearchParams({
    mode: q.mode,
    start: q.start,
    end: q.end,
    horizons: q.horizons.join(","),
    detail_n: String(q.detail_n),
  });
}

/** 資料庫涵蓋範圍：篩選快照（可回測哪些日子）+ 收盤價（能算到多久之後）。 */
export async function fetchBacktestCoverage(
  signal?: AbortSignal,
): Promise<BacktestCoverage> {
  const res = await fetch(`${BASE}/backtestapi/coverage`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as BacktestCoverage;
}

export async function runBacktest(
  query: BacktestQuery,
  signal?: AbortSignal,
): Promise<BacktestResult> {
  const qs = buildQuery(query);
  qs.set("detail_limit", "500");
  const res = await fetch(`${BASE}/backtestapi/run?${qs.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as BacktestResult;
}

/** 明細 .xlsx 的公開網址 —— 無需帶 token，可直接當 <a href>。 */
export function backtestXlsxUrl(query: BacktestQuery): string {
  return `${BASE}/backtestapi/backtest.xlsx?${buildQuery(query).toString()}`;
}
