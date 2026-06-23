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

type SortKey = "change_pct" | "vol_ratio" | "close" | "lots";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; label: string; sortable: boolean }[] = [
  { key: null, label: "代號 / 名稱", sortable: false },
  { key: null, label: "市場", sortable: false },
  { key: "close", label: "現價", sortable: true },
  { key: "change_pct", label: "漲跌", sortable: true },
  { key: "lots", label: "量(張)", sortable: true },
  { key: "vol_ratio", label: "量比", sortable: true },
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
                {c.label}
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
                title={clickable ? "查看歷史K線與紀錄" : undefined}
              >
                <td className="cell-symbol" data-label="代號 / 名稱">
                  <span className="cell-symbol__code">{r.symbol}</span>
                  <span className="cell-symbol__name">{r.name || "—"}</span>
                  {clickable && <span className="cell-symbol__chart" aria-hidden="true">📈</span>}
                </td>
                <td className="cell-market" data-label="市場">{r.market || "—"}</td>
                <td className="num" data-label="現價">{fmtNum(r.close)}</td>
                <td className={`num cell-change ${cls}`} data-label="漲跌">
                  <span>{fmtChange(r.change)}</span>
                  <span className="cell-change__pct">{fmtPct(r.change_pct)}</span>
                </td>
                <td className="num" data-label="量(張)">{fmtLots(r.lots)}</td>
                <td className="num" data-label="量比">{fmtRatio(r.vol_ratio)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">
        點任一列查看<strong>歷史K線 + 我的紀錄</strong>。
        清單為通過 6 項硬條件的起漲個股，<strong>僅供資訊參考</strong>，非投資建議。
      </p>
    </div>
  );
}
