// src/components/RecordsPage.tsx
// 「我的紀錄」分頁：列出個股紀錄（目標價/成本價 + 報酬・距目標 + 紀錄時間），資料來自非同步 repo。
import { useRecords } from "../records/RecordsContext";
import { useToast } from "./ui/Toast";
import { fmtNum, fmtPct, fmtDateTime } from "../utils/format";
import { useT } from "../i18n";

function signClass(v: number | null): string {
  if (v == null) return "";
  return v >= 0 ? "up" : "down";
}

/** 載入中骨架列：取代純文字，降低版面跳動感 */
function RecordsSkeleton() {
  const t = useT();
  return (
    <div className="table-wrap" aria-busy="true" aria-label={t("records.loadingAria")}>
      <table className="stock-table records-table">
        <thead>
          <tr>
            <th>{t("th.symbol")}</th>
            <th>{t("th.market")}</th>
            <th>{t("th.price")}</th>
            <th>{t("th.cost")}</th>
            <th>{t("th.target")}</th>
            <th>{t("th.return")}</th>
            <th>{t("th.upside")}</th>
            <th>{t("th.time")}</th>
            <th>{t("th.action")}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              {Array.from({ length: 9 }).map((__, j) => (
                <td key={j}>
                  <span className="skeleton-bar" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordsPage() {
  const { records, remove, loading, error, reload } = useRecords();
  const toast = useToast();
  const t = useT();
  const list = Object.values(records).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function handleRemove(marketCode: string, symbol: string) {
    try {
      await remove(marketCode, symbol);
      toast.success(t("toast.removed"));
    } catch (e) {
      toast.error((e as Error).message || t("toast.removeFailed"));
    }
  }

  if (loading) {
    return <RecordsSkeleton />;
  }

  if (error) {
    return (
      <div className="records-empty">
        <p className="records-empty__main records-empty__err">{t("records.loadFailed")}</p>
        <p className="records-empty__hint">{error}</p>
        <button className="remove-btn" onClick={reload}>{t("common.reload")}</button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="records-empty">
        <p className="records-empty__main">{t("records.empty")}</p>
        <p className="records-empty__hint">{t("records.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="stock-table records-table">
        <thead>
          <tr>
            <th>{t("th.symbol")}</th>
            <th>{t("th.market")}</th>
            <th>{t("th.price")}</th>
            <th>{t("th.cost")}</th>
            <th>{t("th.target")}</th>
            <th>{t("th.return")}</th>
            <th>{t("th.upside")}</th>
            <th>{t("th.time")}</th>
            <th>{t("th.action")}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const ret =
              r.lastClose != null && r.costPrice != null && r.costPrice > 0
                ? ((r.lastClose - r.costPrice) / r.costPrice) * 100
                : null;
            const upside =
              r.lastClose != null && r.targetPrice != null && r.lastClose > 0
                ? ((r.targetPrice - r.lastClose) / r.lastClose) * 100
                : null;
            return (
              <tr key={`${r.marketCode}-${r.symbol}`}>
                <td className="cell-symbol" data-label={t("th.symbol")}>
                  <span className="cell-symbol__code">{r.symbol}</span>
                  <span className="cell-symbol__name">{r.name || "—"}</span>
                </td>
                <td className="cell-market" data-label={t("th.market")}>{r.market || "—"}</td>
                <td className="num" data-label={t("th.price")}>{fmtNum(r.lastClose)}</td>
                <td className="num" data-label={t("th.cost")}>{fmtNum(r.costPrice)}</td>
                <td className="num" data-label={t("th.target")}>{fmtNum(r.targetPrice)}</td>
                <td className={`num ${signClass(ret)}`} data-label={t("th.return")}>
                  {ret == null ? "—" : fmtPct(ret)}
                </td>
                <td className={`num ${signClass(upside)}`} data-label={t("th.upside")}>
                  {upside == null ? "—" : fmtPct(upside)}
                </td>
                <td className="cell-time" data-label={t("th.time")}>{fmtDateTime(r.updatedAt)}</td>
                <td data-label={t("th.action")}>
                  <button
                    className="remove-btn"
                    onClick={() => void handleRemove(r.marketCode, r.symbol)}
                  >
                    {t("common.remove")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">
        {t("records.tableNotePre")}
        <code>/userapi/records</code>
        {t("records.tableNotePost")}
      </p>
    </div>
  );
}
