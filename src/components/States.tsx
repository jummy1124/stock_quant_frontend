// src/components/States.tsx
// 載入中 / 資料準備中 (503) / 空清單 三種狀態畫面。
import { useT } from "../i18n";

export function LoadingState() {
  const t = useT();
  return (
    <div className="state state--loading">
      <div className="spinner" aria-hidden />
      <p>{t("common.loading")}</p>
    </div>
  );
}

export function NotReadyState() {
  const t = useT();
  return (
    <div className="state state--notready">
      <div className="spinner" aria-hidden />
      <p>{t("state.notReady")}</p>
      <p className="state__hint">{t("state.notReadyHint")}</p>
    </div>
  );
}

export function EmptyState() {
  const t = useT();
  return (
    <div className="state state--empty">
      <p className="state__icon" aria-hidden>
        📭
      </p>
      <p>{t("state.empty")}</p>
      <p className="state__hint">{t("state.emptyHint")}</p>
    </div>
  );
}
