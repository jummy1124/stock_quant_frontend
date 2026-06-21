// src/components/StockDetailModal.tsx
// 點選個股後彈出：左側 6 個月歷史K線（K棒 + 量 + MA5/20/60），右側「我的紀錄」面板。
import { useEffect, useState } from "react";
import type { BreakoutRow } from "../types/screen";
import type { HistoryResponse } from "../types/history";
import { fetchHistory } from "../api/history";
import { fmtNum, fmtPct, changeClass } from "../utils/format";
import { StockChart } from "./StockChart";
import { StockRecordPanel } from "./StockRecordPanel";

export function StockDetailModal({
  row,
  onClose,
}: {
  row: BreakoutRow;
  onClose: () => void;
}) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    fetchHistory(row.symbol, { months: 6, market: row.market_code || undefined }, ac.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError((e as Error).message || "載入失敗");
        setLoading(false);
      });
    return () => ac.abort();
  }, [row.symbol, row.market_code]);

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cls = changeClass(row.change_pct);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${row.symbol} ${row.name} 歷史走勢與紀錄`}
      >
        <header className="modal__head">
          <div className="modal__title">
            <span className="modal__code">{row.symbol}</span>
            <span className="modal__name">{row.name || "—"}</span>
            <span className="modal__market">{row.market || "—"}</span>
            <span className={`modal__price ${cls}`}>
              {fmtNum(row.close)} <small>{fmtPct(row.change_pct)}</small>
            </span>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="modal__legend">
          <span className="lg lg--ma5">MA5</span>
          <span className="lg lg--ma20">MA20</span>
          <span className="lg lg--ma60">MA60</span>
          <span className="lg lg--vol">成交量(張)</span>
          {data && (
            <span className="modal__meta">
              {data.count} 根日K · 近 {data.months} 個月{data.cached ? " · 快取" : ""}
            </span>
          )}
        </div>

        <div className="modal__body">
          <div className="modal__chart">
            {loading ? (
              <div className="modal__state">載入歷史資料中…</div>
            ) : error ? (
              <div className="modal__state modal__state--err">歷史資料載入失敗：{error}</div>
            ) : data && data.candles.length > 0 ? (
              <StockChart candles={data.candles} />
            ) : (
              <div className="modal__state">查無此檔歷史資料。</div>
            )}
          </div>

          <StockRecordPanel row={row} />
        </div>

        <footer className="modal__foot">
          ⚠️ 歷史資訊僅供參考，非投資建議。紅K收漲 / 綠K收跌（台股慣例）。
        </footer>
      </div>
    </div>
  );
}
