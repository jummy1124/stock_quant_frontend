// src/components/StatusBar.tsx
import type { Meta } from "../types/screen";
import { fmtAge, fmtClock, isStale } from "../utils/format";

interface Props {
  meta: Meta | null;
  notReady: boolean;
  error: string | null;
}

function SourceBadge({ source }: { source: Meta["source"] }) {
  if (source === "live") {
    return <span className="badge badge--live">● 盤中即時</span>;
  }
  if (source === "eod") {
    return <span className="badge badge--eod">● 最後交易日收盤</span>;
  }
  return <span className="badge badge--unknown">● 資料源未知</span>;
}

export function StatusBar({ meta, notReady, error }: Props) {
  const stale = isStale(meta?.age_seconds);

  return (
    <div className="statusbar">
      <div className="statusbar__row">
        <SourceBadge source={meta?.source ?? null} />

        <span className={`statusbar__age${stale ? " statusbar__age--stale" : ""}`}>
          {fmtAge(meta?.age_seconds)}
          {meta?.generated_at ? ` (${fmtClock(meta.generated_at)})` : ""}
          {stale ? " · 資料可能延遲" : ""}
        </span>

        {meta && (
          <span className="statusbar__stats">
            掃描 {meta.universe.toLocaleString("zh-TW")} 檔 · 可算{" "}
            {meta.quotable.toLocaleString("zh-TW")} · 漲幅池 {meta.pool_size} · 入選{" "}
            {meta.count}
          </span>
        )}
      </div>

      {meta?.warning && (
        <div className="alert alert--warning" role="alert">
          ⚠️ 報價限流：{meta.warning}
        </div>
      )}
      {meta?.last_error && (
        <div className="alert alert--error" role="alert">
          後端錯誤：{meta.last_error}（顯示為上一份可用資料）
        </div>
      )}
      {error && (
        <div className="alert alert--offline" role="alert">
          連線異常：{error}（下次輪詢將自動重試）
        </div>
      )}
      {notReady && (
        <div className="alert alert--info" role="status">
          資料準備中…將自動更新
        </div>
      )}
    </div>
  );
}
