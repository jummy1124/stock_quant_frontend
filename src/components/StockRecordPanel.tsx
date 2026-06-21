// src/components/StockRecordPanel.tsx
// 彈窗右側「我的紀錄」面板：目標價 / 成本價 + 即時試算，儲存走非同步 repo（dev 由 MSW 接）。
import { useState } from "react";
import type { BreakoutRow } from "../types/screen";
import { useRecords } from "../records/RecordsContext";
import { fmtNum, fmtPct, fmtDateTime } from "../utils/format";

export function StockRecordPanel({ row }: { row: BreakoutRow }) {
  const { get, upsert } = useRecords();
  const existing = get(row.market_code, row.symbol);

  const [target, setTarget] = useState(
    existing?.targetPrice != null ? String(existing.targetPrice) : "",
  );
  const [cost, setCost] = useState(existing?.costPrice != null ? String(existing.costPrice) : "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = row.close;
  const targetNum = target.trim() === "" ? null : Number(target);
  const costNum = cost.trim() === "" ? null : Number(cost);
  const targetValid = targetNum == null || !Number.isNaN(targetNum);
  const costValid = costNum == null || !Number.isNaN(costNum);

  const ret =
    close != null && costNum != null && costNum > 0 ? ((close - costNum) / costNum) * 100 : null;
  const upside =
    close != null && targetNum != null && close > 0 ? ((targetNum - close) / close) * 100 : null;

  async function save() {
    if (!targetValid || !costValid || pending) return;
    setPending(true);
    setErr(null);
    try {
      await upsert({
        symbol: row.symbol,
        name: row.name,
        market: row.market,
        marketCode: row.market_code,
        lastClose: close,
        targetPrice: targetNum,
        costPrice: costNum,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setErr((e as Error).message || "儲存失敗");
    } finally {
      setPending(false);
    }
  }

  function signClass(v: number | null): string {
    if (v == null) return "";
    return v >= 0 ? "up" : "down";
  }

  return (
    <aside className="record-panel">
      <h3 className="record-panel__title">我的紀錄</h3>

      <label className="record-field">
        <span>目標價</span>
        <input
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="例如 120"
          className={targetValid ? undefined : "invalid"}
        />
      </label>

      <label className="record-field">
        <span>成本價</span>
        <input
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="例如 95.5"
          className={costValid ? undefined : "invalid"}
        />
      </label>

      <div className="record-calc">
        <div className="record-calc__row">
          <span>現價</span>
          <span className="num">{fmtNum(close)}</span>
        </div>
        <div className="record-calc__row">
          <span>報酬率（對成本）</span>
          <span className={`num ${signClass(ret)}`}>{ret == null ? "—" : fmtPct(ret)}</span>
        </div>
        <div className="record-calc__row">
          <span>距目標</span>
          <span className={`num ${signClass(upside)}`}>{upside == null ? "—" : fmtPct(upside)}</span>
        </div>
      </div>

      <button
        className="record-save"
        onClick={save}
        disabled={!targetValid || !costValid || pending}
      >
        {pending ? "儲存中…" : saved ? "已儲存 ✓" : "儲存"}
      </button>

      {err && <p className="record-error">儲存失敗：{err}</p>}

      {existing?.updatedAt && (
        <p className="record-time">紀錄時間：{fmtDateTime(existing.updatedAt)}</p>
      )}

      <p className="record-hint">＊ 多人版預備：已走真實 fetch /userapi，dev 由 MSW 模擬後端。</p>
    </aside>
  );
}
