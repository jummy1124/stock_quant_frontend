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
import { Reasons } from "./Reasons";

type SortKey = "score" | "change_pct" | "vol_ratio" | "close" | "lots";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; label: string; sortable: boolean }[] = [
  { key: null, label: "代號 / 名稱", sortable: false },
  { key: null, label: "市場", sortable: false },
  { key: "close", label: "現價", sortable: true },
  { key: "change_pct", label: "漲跌", sortable: true },
  { key: "lots", label: "量(張)", sortable: true },
  { key: "vol_ratio", label: "量比", sortable: true },
  { key: "score", label: "強度分", sortable: true },
  { key: null, label: "入選理由", sortable: false },
];

function sortVal(row: BreakoutRow, key: SortKey): number {
  const v = row[key];
  return v == null || Number.isNaN(v) ? -Infinity : v;
}

export function StockTable({ rows }: { rows: BreakoutRow[] }) {
  // 預設 null：照後端原順序 (已依 score 由高到低排好)
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
                {c.label}
                {sortIndicator(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const cls = changeClass(r.change_pct);
            return (
              <tr key={`${r.market_code}-${r.symbol}`}>
                <td className="cell-symbol">
                  <span className="cell-symbol__code">{r.symbol}</span>
                  <span className="cell-symbol__name">{r.name || "—"}</span>
                </td>
                <td className="cell-market">{r.market || "—"}</td>
                <td className="num">{fmtNum(r.close)}</td>
                <td className={`num cell-change ${cls}`}>
                  <span>{fmtChange(r.change)}</span>
                  <span className="cell-change__pct">{fmtPct(r.change_pct)}</span>
                </td>
                <td className="num">{fmtLots(r.lots)}</td>
                <td className="num">{fmtRatio(r.vol_ratio)}</td>
                <td className="num">
                  <span className="score-badge" title="僅供排序，非投資評級">
                    {fmtNum(r.score, 1)}
                  </span>
                </td>
                <td>
                  <Reasons reasons={r.reasons} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">
        強度分由「量增幅度 + 突破幅度 + 月線斜率」綜合，<strong>僅供排序</strong>，非漲跌預測或投資評級。
      </p>
    </div>
  );
}
