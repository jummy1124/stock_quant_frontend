// src/components/StockTable.tsx
import { useMemo, useState } from "react";
import type { BreakoutRow } from "../types/screen";
import {
  changeClass,
  fmtChange,
  fmtLots,
  fmtNum,
  fmtPct,
  fmtRatio,
} from "../utils/format";
import { useT } from "../i18n";

type SortKey = "change_pct" | "vol_ratio" | "close" | "lots";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; labelKey: string; sortable: boolean }[] = [
  { key: null, labelKey: "th.symbol", sortable: false },
  { key: null, labelKey: "th.market", sortable: false },
  { key: "close", labelKey: "th.price", sortable: true },
  { key: "change_pct", labelKey: "th.change", sortable: true },
  { key: "lots", labelKey: "th.lots", sortable: true },
  { key: "vol_ratio", labelKey: "th.volRatio", sortable: true },
];

function sortVal(row: BreakoutRow, key: SortKey): number {
  const v = row[key];
  return v == null || Number.isNaN(v) ? -Infinity : v;
}

export function StockTable({
  rows,
  onSelect,
}: {
  rows: BreakoutRow[];
  /** 點選某列時呼叫（開啟歷史走勢 + 紀錄面板） */
  onSelect?: (row: BreakoutRow) => void;
}) {
  const t = useT();
  // 預設 null：照後端原順序 (依評估順序)
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = sortVal(a, sortKey) - sortVal(b, sortKey);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey | null) {
    if (!key || sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="table-wrap">
      <table className="stock-table">
        <thead>
          <tr>
            {COLUMNS.map((c, i) => (
              <th
                key={i}
                className={c.sortable ? "sortable" : undefined}
                onClick={c.sortable && c.key ? () => toggleSort(c.key!) : undefined}
                aria-sort={
                  c.key && sortKey === c.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {t(c.labelKey)}
                {sortIndicator(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const cls = changeClass(r.change_pct);
            const clickable = Boolean(onSelect);
            return (
              <tr
                key={`${r.market_code}-${r.symbol}`}
                className={clickable ? "clickable-row" : undefined}
                onClick={clickable ? () => onSelect!(r) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect!(r);
                        }
                      }
                    : undefined
                }
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                title={clickable ? t("table.viewHistory") : undefined}
              >
                <td className="cell-symbol" data-label={t("th.symbol")}>
                  <span className="cell-symbol__code">{r.symbol}</span>
                  <span className="cell-symbol__name">{r.name || "—"}</span>
                  {clickable && <span className="cell-symbol__chart" aria-hidden="true">📈</span>}
                </td>
                <td className="cell-market" data-label={t("th.market")}>{r.market || "—"}</td>
                <td className="num" data-label={t("th.price")}>{fmtNum(r.close)}</td>
                <td className={`num cell-change ${cls}`} data-label={t("th.change")}>
                  <span>{fmtChange(r.change)}</span>
                  <span className="cell-change__pct">{fmtPct(r.change_pct)}</span>
                </td>
                <td className="num" data-label={t("th.lots")}>{fmtLots(r.lots)}</td>
                <td className="num" data-label={t("th.volRatio")}>{fmtRatio(r.vol_ratio)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">
        {t("table.notePre")}
        <strong>{t("table.noteStrong")}</strong>
        {t("table.notePost")}
        <strong>{t("table.noteStrong2")}</strong>
        {t("table.notePost2")}
      </p>
    </div>
  );
}
