// src/records/RecordsContext.tsx
// 個股紀錄狀態：透過 RecordsRepo 取資料（預設打 /userapi，dev 由 MSW 攔截）。
// 操作皆為非同步，UI 以 loading / error 呈現 —— 之後換真後端時程式碼路徑不變。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RecordDraft, StockRecord } from "./types";
import { HttpRecordsRepo, type RecordsRepo } from "./RecordsRepo";

export type { StockRecord, RecordDraft } from "./types";

interface RecordsCtx {
  records: Record<string, StockRecord>;
  count: number;
  loading: boolean;
  error: string | null;
  get: (marketCode: string, symbol: string) => StockRecord | undefined;
  upsert: (draft: RecordDraft) => Promise<void>;
  remove: (marketCode: string, symbol: string) => Promise<void>;
  reload: () => void;
}

const Ctx = createContext<RecordsCtx | null>(null);

const keyOf = (marketCode: string, symbol: string) => `${marketCode}-${symbol}`;

/** 預設用 HTTP 實作；測試可用 props 注入 InMemoryRecordsRepo */
const defaultRepo: RecordsRepo = new HttpRecordsRepo();

export function RecordsProvider({
  children,
  repo = defaultRepo,
}: {
  children: ReactNode;
  repo?: RecordsRepo;
}) {
  const [records, setRecords] = useState<Record<string, StockRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await repo.list();
      const map: Record<string, StockRecord> = {};
      for (const r of list) map[keyOf(r.marketCode, r.symbol)] = r;
      setRecords(map);
    } catch (e) {
      setError((e as Error).message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  const api = useMemo<RecordsCtx>(
    () => ({
      records,
      count: Object.keys(records).length,
      loading,
      error,
      get: (mc, s) => records[keyOf(mc, s)],
      upsert: async (d) => {
        const rec = await repo.upsert(d);
        setRecords((prev) => ({ ...prev, [keyOf(rec.marketCode, rec.symbol)]: rec }));
      },
      remove: async (mc, s) => {
        await repo.remove(mc, s);
        setRecords((prev) => {
          const copy = { ...prev };
          delete copy[keyOf(mc, s)];
          return copy;
        });
      },
      reload: () => void load(),
    }),
    [records, loading, error, repo, load],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRecords(): RecordsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRecords 必須在 <RecordsProvider> 內使用");
  return c;
}
