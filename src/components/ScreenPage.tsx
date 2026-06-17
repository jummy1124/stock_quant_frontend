// src/components/ScreenPage.tsx
import { useState } from "react";
import { useScreen } from "../hooks/useScreen";
import { Header } from "./Header";
import { StatusBar } from "./StatusBar";
import { Controls } from "./Controls";
import { StockTable } from "./StockTable";
import { EmptyState, LoadingState, NotReadyState } from "./States";

export function ScreenPage() {
  const [top, setTop] = useState(0); // 0 = 全部
  const [minScore, setMinScore] = useState(0);

  const { data, loading, notReady, error } = useScreen({
    top: top || undefined,
    minScore: minScore || undefined,
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
        minScore={minScore}
        onTopChange={setTop}
        onMinScoreChange={setMinScore}
      />

      <main className="screen-page__body">
        {loading && !hasData ? (
          <LoadingState />
        ) : notReady && !hasData ? (
          <NotReadyState />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <StockTable rows={results} />
        )}
      </main>

      <footer className="app-footer">
        ⚠️ 篩選結果為機率性資訊參考，非投資建議。資料源依交易時間自動切換（盤中即時 / 收盤）。
      </footer>
    </div>
  );
}
