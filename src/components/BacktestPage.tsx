// src/components/BacktestPage.tsx
//
// 「回測」分頁：拿資料庫裡所有的起漲篩選紀錄，統計這些個股在第 N 個交易日之後
// 漲跌如何、上漲的機率是多少。
//
// 兩種比法（對應每天上傳的兩份快照）：
//   盤中13:00 → 收盤價：進場價是 13:00 快照當下的價格，出場是第 N 個交易日收盤價。
//                        N 可以是 0，也就是「一點鐘買、當天收盤結算」。
//   收盤價 → 收盤價：  進場價是收盤快照的收盤價，出場是第 N 個交易日收盤價。
//
// 統計一律在後端算（它才有全市場每日收盤價與交易日曆），這裡只負責出題與呈現。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BACKTEST_MODES,
  HORIZON_PRESETS,
  MAX_HORIZON,
  MAX_HORIZONS,
  type BacktestCoverage,
  type BacktestMode,
  type BacktestQuery,
  type BacktestResult,
} from "../types/backtest";
import {
  backtestXlsxUrl,
  fetchBacktestCoverage,
  runBacktest,
} from "../api/backtest";
import { WinRateChart } from "./WinRateChart";
import { useI18n } from "../i18n";
import { DASH, changeClass, fmtNum, fmtPct } from "../utils/format";

const LS_QUERY = "backtest_query_v1";
const DEFAULT_HORIZONS = [1, 2, 3, 5, 10, 20];

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DEFAULT_QUERY: BacktestQuery = {
  mode: "close_to_close",
  start: "",
  end: "",
  horizons: DEFAULT_HORIZONS,
  detail_n: 1,
};

function loadQuery(): BacktestQuery {
  try {
    const raw = localStorage.getItem(LS_QUERY);
    if (!raw) return DEFAULT_QUERY;
    const parsed = JSON.parse(raw) as Partial<BacktestQuery>;
    return { ...DEFAULT_QUERY, ...parsed };
  } catch {
    return DEFAULT_QUERY;
  }
}

/** 勝率 0~1 → "58.3%"；null（無樣本）→ "—"，絕不顯示成 0%。 */
function fmtRate(v: number | null | undefined): string {
  if (v == null) return DASH;
  return `${(v * 100).toFixed(1)}%`;
}

export function BacktestPage() {
  const { t } = useI18n();
  const [coverage, setCoverage] = useState<BacktestCoverage | null>(null);
  const [query, setQuery] = useState<BacktestQuery>(loadQuery);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customN, setCustomN] = useState("");
  const [customErr, setCustomErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LS_QUERY, JSON.stringify(query));
    } catch {
      /* 無痕模式：忽略 */
    }
  }, [query]);

  // 開頁先問資料庫涵蓋範圍，並把日期預設拉滿 —— 使用者要的是「過去所有的紀錄」，
  // 所以預設就該是全部，而不是逼他先猜一個區間。
  useEffect(() => {
    const ac = new AbortController();
    fetchBacktestCoverage(ac.signal)
      .then((cov) => {
        setCoverage(cov);
        setQuery((q) => ({
          ...q,
          start: q.start || cov.snapshots.min_date || todayStr(),
          end: q.end || cov.snapshots.max_date || todayStr(),
        }));
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError((e as Error).message);
      });
    return () => ac.abort();
  }, []);

  const modeIsIntraday = query.mode === "intraday_to_close";

  // 顯示的按鈕 = 三個常用值 ∪ 目前實際選到的值。自訂進來的 N 因此和預設值長得
  // 一樣、待在同一排，使用者永遠看得到「現在到底在統計哪些天數」，不必回頭去
  // 讀輸入欄。
  const horizonChips = useMemo(() => {
    const set = new Set<number>([...HORIZON_PRESETS, ...query.horizons]);
    return [...set].sort((a, b) => a - b);
  }, [query.horizons]);

  const canRun =
    !busy && !!query.start && !!query.end && query.start <= query.end &&
    query.horizons.length > 0;

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    try {
      setResult(await runBacktest(query, ac.signal));
    } catch (e) {
      if (!ac.signal.aborted) {
        setError((e as Error).message);
        setResult(null);
      }
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, [query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function setMode(mode: BacktestMode) {
    setQuery((q) => {
      // 切到「收盤 → 收盤」時把 N=0 拿掉，否則送出去會被後端擋下來。
      const horizons =
        mode === "close_to_close" ? q.horizons.filter((n) => n > 0) : q.horizons;
      const safe = horizons.length ? horizons : DEFAULT_HORIZONS;
      return {
        ...q,
        mode,
        horizons: safe,
        detail_n: safe.includes(q.detail_n) ? q.detail_n : safe[0],
      };
    });
    setResult(null);
  }

  function toggleHorizon(n: number) {
    setQuery((q) => {
      const has = q.horizons.includes(n);
      // 至少留一個 N，否則沒有東西可統計。
      if (has && q.horizons.length === 1) return q;
      const horizons = (has ? q.horizons.filter((x) => x !== n) : [...q.horizons, n])
        .sort((a, b) => a - b);
      return {
        ...q,
        horizons,
        detail_n: horizons.includes(q.detail_n) ? q.detail_n : horizons[0],
      };
    });
    setResult(null);
  }

  /** 檢查一個手動輸入的 N，合法回 null，否則回要顯示給使用者的原因。 */
  function rejectReason(n: number): string | null {
    if (!Number.isInteger(n)) return t("bt.customN.integer");
    if (n < 0 || n > MAX_HORIZON) return t("bt.customN.range", { max: MAX_HORIZON });
    // N=0（當日收盤）只有 13:00 進場才有意義；收盤對收盤時它等於自己比自己。
    if (n === 0 && !modeIsIntraday) return t("bt.customN.zeroOnlyIntraday");
    if (!query.horizons.includes(n) && query.horizons.length >= MAX_HORIZONS)
      return t("bt.customN.tooMany", { max: MAX_HORIZONS });
    return null;
  }

  function addCustomHorizon(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    const raw = customN.trim();
    if (!raw) return;
    const n = Number(raw);
    if (raw === "" || Number.isNaN(n)) {
      setCustomErr(t("bt.customN.integer"));
      return;
    }
    const reason = rejectReason(n);
    if (reason) {
      setCustomErr(reason);
      return;
    }
    setCustomErr(null);
    setCustomN("");
    // 已經選過就不重複加，但仍然清空輸入欄 —— 使用者的意圖已經達成了。
    if (query.horizons.includes(n)) return;
    setQuery((q) => ({
      ...q,
      horizons: [...q.horizons, n].sort((a, b) => a - b),
    }));
    setResult(null);
  }

  function useFullRange() {
    if (!coverage?.snapshots.min_date || !coverage.snapshots.max_date) return;
    setQuery((q) => ({
      ...q,
      start: coverage.snapshots.min_date!,
      end: coverage.snapshots.max_date!,
    }));
    setResult(null);
  }

  const headline = result?.summary.find((s) => s.n === result.detail_n) ?? null;

  return (
    <div className="screen-page">
      <header className="app-header">
        <div className="app-header__title">
          <h1>{t("bt.title")}</h1>
          <p className="app-header__subtitle">{t("bt.subtitle")}</p>
        </div>
      </header>

      <main className="screen-page__body bt-body">
        {/* ---- 涵蓋範圍：先說清楚資料有多少，空結果才有辦法自我解釋 ---- */}
        {coverage && (
          <p className="bt-coverage">
            <span>
              {t("bt.coverage.snapshots", {
                min: coverage.snapshots.min_date ?? DASH,
                max: coverage.snapshots.max_date ?? DASH,
                days: coverage.snapshots.trading_days,
              })}
            </span>
            <span>
              {t("bt.coverage.prices", {
                min: coverage.prices.min_date ?? DASH,
                max: coverage.prices.max_date ?? DASH,
                days: coverage.prices.trading_days,
                symbols: coverage.prices.symbols,
              })}
            </span>
          </p>
        )}
        {coverage && coverage.prices.trading_days === 0 && (
          <p className="alert alert--warning bt-alert">{t("bt.noPrices")}</p>
        )}

        {/* ---- 查詢條件 ---- */}
        <section className="bt-controls">
          <div className="bt-controls__row">
            <label className="bt-field">
              <span className="bt-field__label">{t("bt.field.mode")}</span>
              <select
                className="controls__select"
                value={query.mode}
                onChange={(e) => setMode(e.target.value as BacktestMode)}
              >
                {BACKTEST_MODES.map((m) => (
                  <option key={m} value={m}>
                    {t(`bt.mode.${m}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="bt-field">
              <span className="bt-field__label">{t("bt.field.start")}</span>
              <input
                type="date"
                className="bt-input bt-input--date"
                value={query.start}
                max={query.end || undefined}
                onChange={(e) => {
                  setQuery((q) => ({ ...q, start: e.target.value }));
                  setResult(null);
                }}
              />
            </label>

            <label className="bt-field">
              <span className="bt-field__label">{t("bt.field.end")}</span>
              <input
                type="date"
                className="bt-input bt-input--date"
                value={query.end}
                min={query.start || undefined}
                max={todayStr()}
                onChange={(e) => {
                  setQuery((q) => ({ ...q, end: e.target.value }));
                  setResult(null);
                }}
              />
            </label>

            <button
              type="button"
              className="bt-btn bt-btn--ghost"
              onClick={useFullRange}
              disabled={!coverage?.snapshots.min_date}
            >
              {t("bt.allHistory")}
            </button>
          </div>

          <div className="bt-controls__row bt-controls__row--wrap">
            <span className="bt-field__label">{t("bt.field.horizons")}</span>
            <div className="bt-chips">
              {horizonChips.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`bt-chip ${query.horizons.includes(n) ? "bt-chip--on" : ""}`}
                  onClick={() => toggleHorizon(n)}
                  aria-pressed={query.horizons.includes(n)}
                >
                  {t("bt.chart.xLabel", { n })}
                </button>
              ))}
            </div>
            <div className="bt-addn">
              <label className="bt-addn__label" htmlFor="bt-custom-n">
                {t("bt.customN.label")}
              </label>
              <input
                id="bt-custom-n"
                className="bt-input bt-input--n"
                type="number"
                inputMode="numeric"
                min={modeIsIntraday ? 0 : 1}
                max={MAX_HORIZON}
                step={1}
                placeholder={t("bt.customN.placeholder")}
                value={customN}
                onChange={(e) => {
                  setCustomN(e.target.value);
                  setCustomErr(null);
                }}
                onKeyDown={(e) => {
                  // 這一列不是 form，Enter 要自己接 —— 打完數字直接按 Enter 是
                  // 最順的動線，逼使用者去點「加入」只是多一個動作。
                  if (e.key === "Enter") addCustomHorizon(e);
                }}
                aria-invalid={customErr != null}
              />
              <button
                type="button"
                className="bt-btn bt-btn--sm"
                onClick={() => addCustomHorizon()}
                disabled={!customN.trim()}
              >
                {t("bt.customN.add")}
              </button>
            </div>
            {customErr && <p className="bt-error">{customErr}</p>}
            <p className="bt-hint">
              {modeIsIntraday ? t("bt.horizonsHint.intraday") : t("bt.horizonsHint")}
            </p>
          </div>

          <div className="bt-controls__row">
            <button
              type="button"
              className="bt-btn"
              onClick={run}
              disabled={!canRun}
            >
              {busy ? t("common.loading") : t("bt.run")}
            </button>
            {result && result.entries > 0 && (
              <a className="bt-btn bt-btn--ghost" href={backtestXlsxUrl(query)}>
                {t("bt.downloadXlsx")}
              </a>
            )}
          </div>
        </section>

        {error && <p className="alert alert--error bt-alert">{error}</p>}

        {!result && !error && !busy && (
          <div className="state">
            <p className="state__icon">📈</p>
            <p>{t("bt.idle")}</p>
            <p className="state__hint">{t("bt.idleHint")}</p>
          </div>
        )}

        {result && (
          <>
            {result.warning && (
              <p className="alert alert--warning bt-alert">⚠️ {result.warning}</p>
            )}

            {result.entries === 0 ? (
              <div className="state">
                <p className="state__icon">🗓️</p>
                <p>{t("bt.emptyRange")}</p>
                <p className="state__hint">{t("bt.emptyRangeHint")}</p>
              </div>
            ) : (
              <>
                {/* ---- 主結論：使用者問的就是這個數字 ---- */}
                <section className="bt-headline">
                  <div className="bt-headline__hero">
                    <span className="bt-headline__label">
                      {t("bt.hero.label", { n: result.detail_n })}
                    </span>
                    <strong className="bt-headline__value">
                      {fmtRate(headline?.win_rate)}
                    </strong>
                    <span className="bt-headline__sub">
                      {t("bt.hero.sub", {
                        wins: headline?.wins ?? 0,
                        samples: headline?.samples ?? 0,
                      })}
                    </span>
                  </div>
                  <dl className="bt-headline__facts">
                    <div>
                      <dt>{t("bt.fact.signals")}</dt>
                      <dd>{result.entries.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>{t("bt.fact.days")}</dt>
                      <dd>{result.trading_days.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>{t("bt.fact.avg")}</dt>
                      <dd className={changeClass(headline?.avg_return_pct)}>
                        {fmtPct(headline?.avg_return_pct)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("bt.fact.median")}</dt>
                      <dd className={changeClass(headline?.median_return_pct)}>
                        {fmtPct(headline?.median_return_pct)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <WinRateChart
                  stats={result.summary}
                  activeN={result.detail_n}
                  onSelectN={(n) => {
                    setQuery((q) => ({ ...q, detail_n: n }));
                    setResult(null);
                  }}
                />

                {/* ---- 各 N 的完整統計 ---- */}
                <div className="table-wrap">
                  <table className="stock-table bt-table">
                    <thead>
                      <tr>
                        <th>{t("bt.th.n")}</th>
                        <th className="num">{t("bt.th.samples")}</th>
                        <th className="num">{t("bt.th.wins")}</th>
                        <th className="num">{t("bt.th.losses")}</th>
                        <th className="num">{t("bt.th.flat")}</th>
                        <th className="num">{t("bt.th.missing")}</th>
                        <th className="num">{t("bt.th.winRate")}</th>
                        <th className="num">{t("bt.th.avg")}</th>
                        <th className="num">{t("bt.th.median")}</th>
                        <th className="num">{t("bt.th.best")}</th>
                        <th className="num">{t("bt.th.worst")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.summary.map((s) => (
                        <tr
                          key={s.n}
                          className={s.n === result.detail_n ? "bt-row--active" : ""}
                        >
                          <td>{t("bt.chart.xLabel", { n: s.n })}</td>
                          <td className="num">{s.samples.toLocaleString()}</td>
                          <td className="num up">{s.wins.toLocaleString()}</td>
                          <td className="num down">{s.losses.toLocaleString()}</td>
                          <td className="num">{s.flat.toLocaleString()}</td>
                          <td className="num dash">{s.missing.toLocaleString()}</td>
                          <td className="num bt-cell--rate">{fmtRate(s.win_rate)}</td>
                          <td className={`num ${changeClass(s.avg_return_pct)}`}>
                            {fmtPct(s.avg_return_pct)}
                          </td>
                          <td className={`num ${changeClass(s.median_return_pct)}`}>
                            {fmtPct(s.median_return_pct)}
                          </td>
                          <td className="num up">{fmtPct(s.best_return_pct)}</td>
                          <td className="num down">{fmtPct(s.worst_return_pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="table-note">{t("bt.tableNote")}</p>

                {/* ---- 個股明細 ---- */}
                {result.detail.length > 0 && (
                  <>
                    <h2 className="bt-subhead">
                      {t("bt.detailTitle", { n: result.detail_n })}
                      <small>
                        {t("bt.detailCount", {
                          shown: result.detail.length,
                          total: result.detail_total,
                        })}
                      </small>
                    </h2>
                    <div className="table-wrap">
                      <table className="stock-table bt-table">
                        <thead>
                          <tr>
                            <th>{t("bt.th.screenDate")}</th>
                            <th>{t("th.symbol")}</th>
                            <th>{t("th.market")}</th>
                            <th className="num">{t("bt.th.entry")}</th>
                            <th>{t("bt.th.exitDate")}</th>
                            <th className="num">{t("bt.th.exit")}</th>
                            <th className="num">{t("th.change")}</th>
                            <th className="num">{t("bt.th.return")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.detail.map((r) => (
                            <tr key={`${r.trade_date}-${r.symbol}`}>
                              <td className="cell-time">{r.trade_date}</td>
                              <td className="cell-symbol">
                                <span className="cell-symbol__code">{r.symbol}</span>
                                <span className="cell-symbol__name">{r.name}</span>
                              </td>
                              <td className="cell-market">{r.market}</td>
                              <td className="num">{fmtNum(r.entry_price)}</td>
                              <td className="cell-time">{r.exit_date}</td>
                              <td className="num">{fmtNum(r.exit_price)}</td>
                              <td className={`num ${changeClass(r.change)}`}>
                                {fmtNum(r.change)}
                              </td>
                              <td className={`num ${changeClass(r.return_pct)}`}>
                                {fmtPct(r.return_pct)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">{t("bt.footer")}</footer>
    </div>
  );
}
