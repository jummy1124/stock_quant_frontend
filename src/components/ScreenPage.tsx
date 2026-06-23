// src/components/ScreenPage.tsx
import { useEffect, useState } from "react";
import type { BreakoutRow, ScreenSettings } from "../types/screen";
import { DEFAULT_SETTINGS } from "../types/screen";
import { fetchScreenDefaults } from "../api/screen";
import { useScreen } from "../hooks/useScreen";
import { Header } from "./Header";
import { StatusBar } from "./StatusBar";
import { Controls } from "./Controls";
import { StockTable } from "./StockTable";
import { StockDetailModal } from "./StockDetailModal";
import { EmptyState, LoadingState, NotReadyState } from "./States";

const LS_SETTINGS = "screen_settings_v1";

/** 從 localStorage 讀使用者上次的篩選設定；缺漏欄位以內建預設補齊 */
function loadSettings(): ScreenSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ScreenSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const sameSettings = (a: ScreenSettings, b: ScreenSettings) =>
  JSON.stringify(a) === JSON.stringify(b);

export function ScreenPage() {
  const [top, setTop] = useState(0); // 0 = 全部
  const [selected, setSelected] = useState<BreakoutRow | null>(null);
  const [settings, setSettings] = useState<ScreenSettings>(loadSettings);
  // 「預設」以後端為單一真實來源；取不到時退用內建預設
  const [defaults, setDefaults] = useState<ScreenSettings>(DEFAULT_SETTINGS);

  // 設定變更即寫回 localStorage（下次開啟自動沿用）
  useEffect(() => {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    } catch {
      /* localStorage 不可用時忽略 */
    }
  }, [settings]);

  // 啟動時抓後端預設值（供「恢復預設」對齊後端設定）
  useEffect(() => {
    const ac = new AbortController();
    fetchScreenDefaults(ac.signal)
      .then(setDefaults)
      .catch(() => {
        /* 取不到就沿用內建 DEFAULT_SETTINGS */
      });
    return () => ac.abort();
  }, []);

  const { data, loading, notReady, error } = useScreen({
    top: top || undefined,
    settings,
    intervalMs: 30_000,
  });

  const results = data?.results ?? [];
  const hasData = data != null;

  return (
    <div className="screen-page">
      <Header />
      <StatusBar meta={data?.meta ?? null} notReady={notReady} error={error} />
      <Controls
        top={top}
        onTopChange={setTop}
        settings={settings}
        onSettingsChange={setSettings}
        onReset={() => setSettings(defaults)}
        isDefault={sameSettings(settings, defaults)}
      />

      <main className="screen-page__body">
        {loading && !hasData ? (
          <LoadingState />
        ) : notReady && !hasData ? (
          <NotReadyState />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <StockTable rows={results} onSelect={setSelected} />
        )}
      </main>

      {selected && (
        <StockDetailModal row={selected} onClose={() => setSelected(null)} />
      )}

      <footer className="app-footer">
        ⚠️ 篩選結果為機率性資訊參考，非投資建議。資料源依交易時間自動切換（盤中即時 / 收盤）。
      </footer>
    </div>
  );
}
