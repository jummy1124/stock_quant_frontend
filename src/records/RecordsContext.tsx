// src/records/RecordsContext.tsx
// 「個股紀錄」的記憶體狀態（目標價 / 成本價 + 紀錄時間）。
// ⚠️ 排版驗證用：資料只存在本次瀏覽，重新整理即消失，尚未接後端 / 帳號。
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface StockRecord {
  symbol: string;
  name: string;
  market: string;
  marketCode: string;
  targetPrice: number | null;
  costPrice: number | null;
  lastClose: number | null; // 紀錄當下的現價，給列表頁試算用
  updatedAt: string; // 最後更新的日期時間 (ISO8601)
}

/** 寫入用草稿：未帶到的欄位（undefined）會沿用舊值 */
export interface RecordDraft {
  symbol: string;
  name: string;
  market: string;
  marketCode: string;
  targetPrice?: number | null;
  costPrice?: number | null;
  lastClose?: number | null;
}

interface RecordsCtx {
  records: Record<string, StockRecord>;
  count: number;
  get: (marketCode: string, symbol: string) => StockRecord | undefined;
  upsert: (draft: RecordDraft) => void;
  remove: (marketCode: string, symbol: string) => void;
}

const Ctx = createContext<RecordsCtx | null>(null);

const keyOf = (marketCode: string, symbol: string) => `${marketCode}-${symbol}`;

/** 以 prev 為基底併入草稿（用 prev 而非閉包，避免連續更新讀到舊值） */
function mergeWith(prev: Record<string, StockRecord>, d: RecordDraft): StockRecord {
  const old = prev[keyOf(d.marketCode, d.symbol)];
  return {
    symbol: d.symbol,
    name: d.name,
    market: d.market,
    marketCode: d.marketCode,
    targetPrice: d.targetPrice !== undefined ? d.targetPrice : (old?.targetPrice ?? null),
    costPrice: d.costPrice !== undefined ? d.costPrice : (old?.costPrice ?? null),
    lastClose: d.lastClose !== undefined ? d.lastClose : (old?.lastClose ?? null),
    updatedAt: new Date().toISOString(),
  };
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, StockRecord>>({});

  const api = useMemo<RecordsCtx>(
    () => ({
      records,
      count: Object.keys(records).length,
      get: (mc, s) => records[keyOf(mc, s)],
      upsert: (d) =>
        setRecords((prev) => ({ ...prev, [keyOf(d.marketCode, d.symbol)]: mergeWith(prev, d) })),
      remove: (mc, s) =>
        setRecords((prev) => {
          const copy = { ...prev };
          delete copy[keyOf(mc, s)];
          return copy;
        }),
    }),
    [records],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRecords(): RecordsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRecords 必須在 <RecordsProvider> 內使用");
  return c;
}
