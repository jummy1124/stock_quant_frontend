// src/records/types.ts
// 個股紀錄的「前端模型」型別（camelCase）。
// 後端 /userapi 以 snake_case 回傳，由 RecordsRepo 的 HTTP 實作負責轉換。

export interface StockRecord {
  symbol: string;
  name: string;
  market: string;
  marketCode: string;
  targetPrice: number | null;
  costPrice: number | null;
  lastClose: number | null; // 紀錄當下現價，給列表頁試算
  updatedAt: string; // ISO8601
}

/** 寫入用草稿：未帶到的欄位（undefined）由後端 / 實作沿用舊值 */
export interface RecordDraft {
  symbol: string;
  name: string;
  market: string;
  marketCode: string;
  targetPrice?: number | null;
  costPrice?: number | null;
  lastClose?: number | null;
}
