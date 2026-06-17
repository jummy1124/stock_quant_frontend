// src/hooks/useScreen.ts
import { useEffect, useRef, useState } from "react";
import type { ScreenResponse } from "../types/screen";
import { fetchScreen, NotReadyError } from "../api/screen";

export interface ScreenState {
  data: ScreenResponse | null;
  loading: boolean; // 首次載入
  notReady: boolean; // 後端回 503
  error: string | null; // 一般錯誤 (含連線失敗)
}

export interface UseScreenOptions {
  top?: number;
  minScore?: number;
  /** 輪詢間隔，預設 30s */
  intervalMs?: number;
}

/**
 * 每 intervalMs 輪詢 /api/screen。
 * - 立刻打一次，之後定時刷新
 * - 503 → 標記 notReady、保留前一份 data、繼續輪詢
 * - 連線/一般錯誤 → 標記 error、保留前一份 data，下次輪詢自動恢復
 * - 卸載 / 參數變更時 AbortController 取消在途請求並清除計時器
 */
export function useScreen(opts: UseScreenOptions = {}): ScreenState {
  const { top, minScore, intervalMs = 30_000 } = opts;
  const [state, setState] = useState<ScreenState>({
    data: null,
    loading: true,
    notReady: false,
    error: null,
  });
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function tick() {
      try {
        const data = await fetchScreen({ top, minScore }, ac.signal);
        if (!alive) return;
        setState({ data, loading: false, notReady: false, error: null });
      } catch (e) {
        if (!alive || ac.signal.aborted) return;
        if (e instanceof NotReadyError) {
          // 保留前一份 data，只標記 notReady，持續輪詢
          setState((s) => ({ ...s, loading: false, notReady: true, error: null }));
        } else {
          setState((s) => ({
            ...s,
            loading: false,
            error: (e as Error).message || "連線失敗",
          }));
        }
      }
    }

    void tick(); // 立刻打一次
    timer.current = setInterval(() => void tick(), intervalMs);

    return () => {
      alive = false;
      ac.abort();
      if (timer.current) clearInterval(timer.current);
    };
  }, [top, minScore, intervalMs]);

  return state;
}
