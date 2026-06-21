// src/mocks/handlers.ts
// MSW 攔截器：在「沒有真後端」時，於瀏覽器端假裝 /userapi 的個股紀錄 CRUD。
// 用 localStorage 暫存，模擬持久化（重整仍在）。接上真 Postgres 後端後，把 MSW 關掉即可。
import { http, HttpResponse } from "msw";

interface ServerRecord {
  symbol: string;
  name: string;
  market: string;
  market_code: string;
  target_price: number | null;
  cost_price: number | null;
  last_close: number | null;
  updated_at: string;
}

const LS_KEY = "mock_userdata_records_v1";
const keyOf = (mc: string, s: string) => `${mc}-${s}`;

function loadStore(): Record<string, ServerRecord> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Record<string, ServerRecord>;
  } catch {
    return {};
  }
}

function saveStore(s: Record<string, ServerRecord>): void {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

interface UpsertBody {
  name?: string;
  market?: string;
  target_price?: number | null;
  cost_price?: number | null;
  last_close?: number | null;
}

export const handlers = [
  http.get("/userapi/records", () => {
    const store = loadStore();
    return HttpResponse.json({ records: Object.values(store) });
  }),

  http.put("/userapi/records/:market/:symbol", async ({ params, request }) => {
    const marketCode = String(params.market);
    const symbol = String(params.symbol);
    const body = (await request.json()) as UpsertBody;
    const rec: ServerRecord = {
      symbol,
      name: body.name ?? "",
      market: body.market ?? "",
      market_code: marketCode,
      target_price: body.target_price ?? null,
      cost_price: body.cost_price ?? null,
      last_close: body.last_close ?? null,
      updated_at: new Date().toISOString(),
    };
    const store = loadStore();
    store[keyOf(marketCode, symbol)] = rec;
    saveStore(store);
    return HttpResponse.json(rec);
  }),

  http.delete("/userapi/records/:market/:symbol", ({ params }) => {
    const store = loadStore();
    delete store[keyOf(String(params.market), String(params.symbol))];
    saveStore(store);
    return new HttpResponse(null, { status: 204 });
  }),
];
