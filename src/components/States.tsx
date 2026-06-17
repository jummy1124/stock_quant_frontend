// src/components/States.tsx
// 載入中 / 資料準備中 (503) / 空清單 三種狀態畫面。

export function LoadingState() {
  return (
    <div className="state state--loading">
      <div className="spinner" aria-hidden />
      <p>載入中…</p>
    </div>
  );
}

export function NotReadyState() {
  return (
    <div className="state state--notready">
      <div className="spinner" aria-hidden />
      <p>資料準備中，稍候自動更新…</p>
      <p className="state__hint">盤剛開或服務剛啟動時屬正常現象。</p>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="state state--empty">
      <p className="state__icon" aria-hidden>
        📭
      </p>
      <p>目前沒有符合的起漲個股</p>
      <p className="state__hint">下次輪詢將自動更新。</p>
    </div>
  );
}
