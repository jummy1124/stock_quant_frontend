// src/components/StockDetailModal.tsx
// 點選個股後彈出：左側 6 個月歷史K線（K棒 + 量 + MA5/20/60 + 今日盤中K + 現價線），
// 右側「我的紀錄」面板。盤中會每 30 秒輪詢 /api/quote 更新今日這根與現價線。
import { useEffect, useMemo, useRef, useState } from "react";
import type { BreakoutRow } from "../types/screen";
import type { Candle, HistoryResponse, LiveCandle, QuoteResponse } from "../types/history";
import { fetchHistory, fetchQuote } from "../api/history";
import { fmtNum, fmtPct, changeClass } from "../utils/format";
import { StockChart } from "./StockChart";
import { StockRecordPanel } from "./StockRecordPanel";
import { useI18n, type Locale } from "../i18n";

const POLL_MS = 30_000;

/** 把盤中即時的「今日一根」合併進歷史日K（同日覆寫、否則附加；保留歷史 MA）。 */
function mergeToday(candles: Candle[], live: LiveCandle | null): Candle[] {
  if (!live) return candles;
  const arr = candles.slice();
  const i = arr.findIndex((c) => c.date === live.date);
  const fields = {
    open: live.open,
    high: live.high,
    low: live.low,
    close: live.close,
    volume: live.volume,
    lots: live.lots,
    change: live.change,
  };
  if (i >= 0) {
    arr[i] = { ...arr[i], ...fields };
  } else {
    arr.push({ ...fields, date: live.date, ma5: null, ma20: null, ma60: null });
  }
  return arr;
}

function fmtClockTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale === "en" ? "en-US" : "zh-TW", { hour12: false });
}

export function StockDetailModal({
  row,
  onClose,
}: {
  row: BreakoutRow;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入歷史日K（含今日盤中K）
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    setQuote(null);
    fetchHistory(
      row.symbol,
      { months: 6, market: row.market_code || undefined, intraday: true },
      ac.signal,
    )
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError((e as Error).message || t("records.loadFailed"));
        setLoading(false);
      });
    return () => ac.abort();
  }, [row.symbol, row.market_code]);

  // 盤中輪詢最新價：立即抓一次，之後每 30 秒；非交易時間抓到一次後停止。
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const ac = new AbortController();

    const clear = () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const tick = async () => {
      try {
        const q = await fetchQuote(row.symbol, row.market_code || undefined, ac.signal);
        if (ac.signal.aborted) return;
        setQuote(q);
        if (!q.trading) clear(); // 非交易時間：價格不再變動，停止輪詢
      } catch {
        // 單次失敗忽略，下次輪詢自動恢復
      }
    };

    void tick();
    timerRef.current = window.setInterval(() => void tick(), POLL_MS);

    return () => {
      ac.abort();
      clear();
    };
  }, [row.symbol, row.market_code]);

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const candles = useMemo(
    () => mergeToday(data?.candles ?? [], quote?.candle ?? null),
    [data, quote],
  );

  // 現價：盤中即時 > 圖上最後一根收盤 > 篩選頁帶進來的 close
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : null;
  const livePrice = quote?.close ?? lastClose ?? row.close;
  const livePct = quote?.change_pct ?? row.change_pct;
  const cls = changeClass(livePct);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("modal.aria", { symbol: row.symbol, name: row.name })}
      >
        <header className="modal__head">
          <div className="modal__title">
            <span className="modal__code">{row.symbol}</span>
            <span className="modal__name">{row.name || "—"}</span>
            <span className="modal__market">{row.market || "—"}</span>
            <span className={`modal__price ${cls}`}>
              {fmtNum(livePrice)} <small>{fmtPct(livePct)}</small>
            </span>
            {quote && quote.close != null && (
              <span className={`modal__live ${quote.source === "live" ? "is-live" : ""}`}>
                {quote.source === "live" ? t("modal.liveTag") : t("modal.eodTag")}
                {quote.as_of ? ` · ${fmtClockTime(quote.as_of, locale)}` : ""}
              </span>
            )}
          </div>
          <button className="modal__close" onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </header>

        <div className="modal__legend">
          <span className="lg lg--ma5">MA5</span>
          <span className="lg lg--ma20">MA20</span>
          <span className="lg lg--ma60">MA60</span>
          <span className="lg lg--vol">{t("chart.volume")}</span>
          {data && (
            <span className="modal__meta">
              {t("modal.meta", { count: data.count, months: data.months })}
              {data.cached ? t("modal.cached") : ""}
              {data.intraday ? t("modal.intraday") : ""}
            </span>
          )}
        </div>

        <div className="modal__body">
          <div className="modal__chart">
            {loading ? (
              <div className="modal__state">{t("modal.loadingHistory")}</div>
            ) : error ? (
              <div className="modal__state modal__state--err">
                {t("modal.historyFailed", { msg: error })}
              </div>
            ) : candles.length > 0 ? (
              <StockChart candles={candles} currentPrice={livePrice} />
            ) : (
              <div className="modal__state">{t("modal.noHistory")}</div>
            )}
          </div>

          <StockRecordPanel row={row} />
        </div>

        <footer className="modal__foot">{t("modal.footer")}</footer>
      </div>
    </div>
  );
}
