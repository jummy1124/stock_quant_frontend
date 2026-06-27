// src/components/StatusBar.tsx
import type { Meta } from "../types/screen";
import { fmtAge, fmtClock, isStale } from "../utils/format";
import { useI18n } from "../i18n";

interface Props {
  meta: Meta | null;
  notReady: boolean;
  error: string | null;
}

function SourceBadge({ source }: { source: Meta["source"] }) {
  const { t } = useI18n();
  if (source === "live") {
    return <span className="badge badge--live">{t("status.live")}</span>;
  }
  if (source === "eod") {
    return <span className="badge badge--eod">{t("status.eod")}</span>;
  }
  return <span className="badge badge--unknown">{t("status.unknown")}</span>;
}

export function StatusBar({ meta, notReady, error }: Props) {
  const { t, locale } = useI18n();
  const stale = isStale(meta?.age_seconds);
  const nf = locale === "en" ? "en-US" : "zh-TW";

  return (
    <div className="statusbar">
      <div className="statusbar__row">
        <SourceBadge source={meta?.source ?? null} />

        <span className={`statusbar__age${stale ? " statusbar__age--stale" : ""}`}>
          {fmtAge(meta?.age_seconds, t)}
          {meta?.generated_at ? ` (${fmtClock(meta.generated_at, locale)})` : ""}
          {stale ? t("status.stale") : ""}
        </span>

        {meta && (
          <span className="statusbar__stats">
            {t("status.stats", {
              universe: meta.universe.toLocaleString(nf),
              quotable: meta.quotable.toLocaleString(nf),
              pool: meta.pool_size,
              count: meta.count,
            })}
          </span>
        )}
      </div>

      {meta?.warning && (
        <div className="alert alert--warning" role="alert">
          {t("status.warning", { msg: meta.warning })}
        </div>
      )}
      {meta?.last_error && (
        <div className="alert alert--error" role="alert">
          {t("status.lastError", { msg: meta.last_error })}
        </div>
      )}
      {error && (
        <div className="alert alert--offline" role="alert">
          {t("status.connError", { msg: error })}
        </div>
      )}
      {notReady && (
        <div className="alert alert--info" role="status">
          {t("status.notReadyAlert")}
        </div>
      )}
    </div>
  );
}
