// src/records/RecordsContext.tsx
// 個股紀錄狀態：透過 RecordsRepo 取資料（預設打 /userapi，dev 可直連後端或由 MSW 攔截）。
// - 僅在「已登入」時載入；登出時清空，未登入不發請求。
// - upsert / remove 採樂觀更新：先更新畫面，失敗回滾並丟出錯誤供呼叫端提示。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RecordDraft, StockRecord } from "./types";
import { HttpRecordsRepo, type RecordsRepo } from "./RecordsRepo";
import { useAuth } from "../auth/AuthContext";

export type { StockRecord, RecordDraft } from "./types";

/** 單筆同步狀態，供 UI 呈現「儲存中 / 同步失敗」 */
export type SyncStatus = "idle" | "saving" | "error";

interface RecordsCtx {
  records: Record<string, StockRecord>;
  count: number;
  loading: boolean;
  error: string | null;
  syncStatus: Record<string, SyncStatus>;
  get: (marketCode: string, symbol: string) => StockRecord | undefined;
  upsert: (draft: RecordDraft) => Promise<void>;
  remove: (marketCode: string, symbol: string) => Promise<void>;
  reload: () => void;
}

const Ctx = createContext<RecordsCtx | null>(null);

const keyOf = (marketCode: string, symbol: string) => `${marketCode}-${symbol}`;

/** 預設用 HTTP 實作；可用 props 注入自訂 RecordsRepo 實作（例如測試用） */
const defaultRepo: RecordsRepo = new HttpRecordsRepo();

export function RecordsProvider({
  children,
  repo = defaultRepo,
}: {
  children: ReactNode;
  repo?: RecordsRepo;
}) {
  const { isAuthenticated } = useAuth();
  const [records, setRecords] = useState<Record<string, StockRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});

  const setSync = useCallback((key: string, s: SyncStatus | null) => {
    setSyncStatus((prev) => {
      if (s === null) {
        if (!(key in prev)) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: s };
    });
  }, []);

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

  // 隨登入狀態載入 / 清空
  useEffect(() => {
    if (isAuthenticated) {
      void load();
    } else {
      setRecords({});
      setSyncStatus({});
      setError(null);
      setLoading(false);
    }
  }, [isAuthenticated, load]);

  // 用 ref 取得最新 records，供樂觀更新回滾
  const recordsRef = useRef(records);
  recordsRef.current = records;

  const upsert = useCallback(
    async (d: RecordDraft) => {
      const key = keyOf(d.marketCode, d.symbol);
      const prev = recordsRef.current[key];
      // 樂觀：先用草稿合併舊值組出畫面用紀錄
      const optimistic: StockRecord = {
        symbol: d.symbol,
        name: d.name,
        market: d.market,
        marketCode: d.marketCode,
        targetPrice: d.targetPrice !== undefined ? d.targetPrice : (prev?.targetPrice ?? null),
        costPrice: d.costPrice !== undefined ? d.costPrice : (prev?.costPrice ?? null),
        lastClose: d.lastClose !== undefined ? d.lastClose : (prev?.lastClose ?? null),
        updatedAt: new Date().toISOString(),
      };
      setRecords((p) => ({ ...p, [key]: optimistic }));
      setSync(key, "saving");
      try {
        const rec = await repo.upsert(d);
        setRecords((p) => ({ ...p, [key]: rec }));
        setSync(key, null);
      } catch (e) {
        // 回滾
        setRecords((p) => {
          const copy = { ...p };
          if (prev) copy[key] = prev;
          else delete copy[key];
          return copy;
        });
        setSync(key, "error");
        throw e;
      }
    },
    [repo, setSync],
  );

  const remove = useCallback(
    async (mc: string, s: string) => {
      const key = keyOf(mc, s);
      const prev = recordsRef.current[key];
      setRecords((p) => {
        const copy = { ...p };
        delete copy[key];
        return copy;
      });
      setSync(key, null);
      try {
        await repo.remove(mc, s);
      } catch (e) {
        // 回滾
        if (prev) setRecords((p) => ({ ...p, [key]: prev }));
        throw e;
      }
    },
    [repo, setSync],
  );

  const api = useMemo<RecordsCtx>(
    () => ({
      records,
      count: Object.keys(records).length,
      loading,
      error,
      syncStatus,
      get: (mc, s) => records[keyOf(mc, s)],
      upsert,
      remove,
      reload: () => void load(),
    }),
    [records, loading, error, syncStatus, upsert, remove, load],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRecords(): RecordsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRecords 必須在 <RecordsProvider> 內使用");
  return c;
}
