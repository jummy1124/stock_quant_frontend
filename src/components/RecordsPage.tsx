// src/components/RecordsPage.tsx
// 「我的紀錄」分頁：列出個股紀錄（目標價/成本價 + 報酬・距目標 + 紀錄時間），資料來自非同步 repo。
import { useRecords } from "../records/RecordsContext";
import { useToast } from "./ui/Toast";
import { fmtNum, fmtPct, fmtDateTime } from "../utils/format";

function signClass(v: number | null): string {
  if (v == null) return "";
  return v >= 0 ? "up" : "down";
}

/** 載入中骨架列：取代純文字，降低版面跳動感 */
function RecordsSkeleton() {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="載入紀錄中">
      <table className="stock-table records-table">
        <thead>
          <tr>
            <th>代號 / 名稱</th>
            <th>市場</th>
            <th>現價</th>
            <th>成本價</th>
            <th>目標價</th>
            <th>報酬率</th>
            <th>距目標</th>
            <th>紀錄時間</th>
            <th>操作</th>
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
  const list = Object.values(records).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function handleRemove(marketCode: string, symbol: string) {
    try {
      await remove(marketCode, symbol);
      toast.success("已移除");
    } catch (e) {
      toast.error((e as Error).message || "移除失敗");
    }
  }

  if (loading) {
    return <RecordsSkeleton />;
  }

  if (error) {
    return (
      <div className="records-empty">
        <p className="records-empty__main records-empty__err">載入失敗</p>
        <p className="records-empty__hint">{error}</p>
        <button className="remove-btn" onClick={reload}>重新載入</button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="records-empty">
        <p className="records-empty__main">還沒有任何紀錄</p>
        <p className="records-empty__hint">
          到「篩選結果」點任一檔個股，在彈窗的「我的紀錄」填入目標價／成本價並儲存，就會出現在這裡。
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="stock-table records-table">
        <thead>
          <tr>
            <th>代號 / 名稱</th>
            <th>市場</th>
            <th>現價</th>
            <th>成本價</th>
            <th>目標價</th>
            <th>報酬率</th>
            <th>距目標</th>
            <th>紀錄時間</th>
            <th>操作</th>
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
                <td className="cell-symbol" data-label="代號 / 名稱">
                  <span className="cell-symbol__code">{r.symbol}</span>
                  <span className="cell-symbol__name">{r.name || "—"}</span>
                </td>
                <td className="cell-market" data-label="市場">{r.market || "—"}</td>
                <td className="num" data-label="現價">{fmtNum(r.lastClose)}</td>
                <td className="num" data-label="成本價">{fmtNum(r.costPrice)}</td>
                <td className="num" data-label="目標價">{fmtNum(r.targetPrice)}</td>
                <td className={`num ${signClass(ret)}`} data-label="報酬率">
                  {ret == null ? "—" : fmtPct(ret)}
                </td>
                <td className={`num ${signClass(upside)}`} data-label="距目標">
                  {upside == null ? "—" : fmtPct(upside)}
                </td>
                <td className="cell-time" data-label="紀錄時間">{fmtDateTime(r.updatedAt)}</td>
                <td data-label="操作">
                  <button
                    className="remove-btn"
                    onClick={() => void handleRemove(r.marketCode, r.symbol)}
                  >
                    移除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">
        ＊ 多人版預備：此頁資料經 <code>/userapi/records</code> 取得（dev 由 MSW 模擬、localStorage 暫存）。
        報酬率以「紀錄當下現價」對成本價試算。
      </p>
    </div>
  );
}
