// src/components/StockRecordPanel.tsx
// 彈窗右側「我的紀錄」面板：目標價 / 成本價 + 即時試算，儲存走非同步 repo（dev 由 MSW 接）。
import { useState } from "react";
import type { BreakoutRow } from "../types/screen";
import { useRecords } from "../records/RecordsContext";
import { useToast } from "./ui/Toast";
import { fmtNum, fmtPct, fmtDateTime } from "../utils/format";
import { useT } from "../i18n";

export function StockRecordPanel({ row }: { row: BreakoutRow }) {
  const { get, upsert } = useRecords();
  const toast = useToast();
  const t = useT();
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
      toast.success(t("toast.saved"));
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      const msg = (e as Error).message || t("toast.saveFailed");
      setErr(msg);
      toast.error(t("recordPanel.saveError", { msg }));
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
      <h3 className="record-panel__title">{t("recordPanel.title")}</h3>

      <label className="record-field">
        <span>{t("recordPanel.target")}</span>
        <input
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={t("recordPanel.targetPlaceholder")}
          className={targetValid ? undefined : "invalid"}
        />
      </label>

      <label className="record-field">
        <span>{t("recordPanel.cost")}</span>
        <input
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder={t("recordPanel.costPlaceholder")}
          className={costValid ? undefined : "invalid"}
        />
      </label>

      <div className="record-calc">
        <div className="record-calc__row">
          <span>{t("recordPanel.current")}</span>
          <span className="num">{fmtNum(close)}</span>
        </div>
        <div className="record-calc__row">
          <span>{t("recordPanel.return")}</span>
          <span className={`num ${signClass(ret)}`}>{ret == null ? "—" : fmtPct(ret)}</span>
        </div>
        <div className="record-calc__row">
          <span>{t("recordPanel.upside")}</span>
          <span className={`num ${signClass(upside)}`}>{upside == null ? "—" : fmtPct(upside)}</span>
        </div>
      </div>

      <button
        className="record-save"
        onClick={save}
        disabled={!targetValid || !costValid || pending}
      >
        {pending ? t("recordPanel.saving") : saved ? t("recordPanel.saved") : t("recordPanel.save")}
      </button>

      {err && <p className="record-error">{t("recordPanel.saveError", { msg: err })}</p>}

      {existing?.updatedAt && (
        <p className="record-time">{t("recordPanel.recordTime", { time: fmtDateTime(existing.updatedAt) })}</p>
      )}

      <p className="record-hint">{t("recordPanel.hint")}</p>
    </aside>
  );
}
