// src/records/RecordsRepo.ts
// 個股紀錄的「資料來源」抽象。元件只依賴 RecordsRepo 介面，不認實作。
//   - HttpRecordsRepo：打 /userapi/records（dev 由 MSW 攔截；正式接 Postgres 後端）
// 將來換資料來源 = 換注入的實作，元件與 Context 不動。
import type { RecordDraft, StockRecord } from "./types";
import { userJson } from "../api/userClient";

export interface RecordsRepo {
  list(): Promise<StockRecord[]>;
  upsert(draft: RecordDraft): Promise<StockRecord>;
  remove(marketCode: string, symbol: string): Promise<void>;
}

// ============================================================
// HTTP 實作（後端契約：snake_case ↔ 前端 camelCase）
// ============================================================

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

function fromServer(r: ServerRecord): StockRecord {
  return {
    symbol: r.symbol,
    name: r.name,
    market: r.market,
    marketCode: r.market_code,
    targetPrice: r.target_price,
    costPrice: r.cost_price,
    lastClose: r.last_close,
    updatedAt: r.updated_at,
  };
}

export class HttpRecordsRepo implements RecordsRepo {
  async list(): Promise<StockRecord[]> {
    const data = await userJson<{ records: ServerRecord[] }>("/records");
    return (data.records ?? []).map(fromServer);
  }

  async upsert(d: RecordDraft): Promise<StockRecord> {
    const body = JSON.stringify({
      name: d.name,
      market: d.market,
      target_price: d.targetPrice ?? null,
      cost_price: d.costPrice ?? null,
      last_close: d.lastClose ?? null,
    });
    const path = `/records/${encodeURIComponent(d.marketCode)}/${encodeURIComponent(d.symbol)}`;
    const rec = await userJson<ServerRecord>(path, { method: "PUT", body });
    return fromServer(rec);
  }

  async remove(marketCode: string, symbol: string): Promise<void> {
    const path = `/records/${encodeURIComponent(marketCode)}/${encodeURIComponent(symbol)}`;
    await userJson<void>(path, { method: "DELETE" });
  }
}
