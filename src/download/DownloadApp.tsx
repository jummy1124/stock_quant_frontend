// src/download/DownloadApp.tsx
//
// Standalone "資料下載" page. Self-contained (only depends on ./downloadApi and
// React) so it can be extracted into its own project. Two areas:
//   1. 篩選快照 (公開)：每個交易日的「盤中13:00」與「收盤後」起漲篩選結果，直接下載 .xlsx。
//   2. 我的紀錄 (需登入)：登入後下載自己記錄的個股 .xlsx。
import { useEffect, useState, type FormEvent } from "react";
import {
  currentUser,
  downloadRecordsXlsx,
  getCoverage,
  listSnapshotsInRange,
  login,
  logout,
  snapshotsRangeXlsxUrl,
  type DownloadUser,
  type SessionName,
  type SnapshotCoverage,
  type SnapshotMeta,
} from "./downloadApi";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Human-readable size (B/KB/MB/GB); "-" when unknown (e.g. non-Postgres backend). */
function formatBytes(bytes: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

export default function DownloadApp() {
  const { t } = useI18n();
  const [coverage, setCoverage] = useState<SnapshotCoverage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<DownloadUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recMsg, setRecMsg] = useState<string | null>(null);

  const [rangeStart, setRangeStart] = useState(todayStr());
  const [rangeEnd, setRangeEnd] = useState(todayStr());
  const [querySession, setQuerySession] = useState<SessionName>("eod");

  // Result of the last live query against the database (not a client cache).
  const [rangeRows, setRangeRows] = useState<SnapshotMeta[] | null>(null);
  const [queryBusy, setQueryBusy] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  async function refreshCoverage() {
    setLoading(true);
    setError(null);
    try {
      setCoverage(await getCoverage());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCoverage();
    void currentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.title = t("dl.docTitle");
  }, [t]);

  async function onQuery(e: FormEvent) {
    e.preventDefault();
    setQueryBusy(true);
    setQueryError(null);
    setRangeRows(null);
    try {
      // Always hits the database live, filtered to exactly [rangeStart, rangeEnd]
      // + querySession — never relies on a pre-fetched/capped client-side list.
      setRangeRows(await listSnapshotsInRange(rangeStart, rangeEnd, querySession));
    } catch (err) {
      setQueryError((err as Error).message);
    } finally {
      setQueryBusy(false);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      setUser(await login(email.trim(), password));
      setPassword("");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }

  function onLogout() {
    logout();
    setUser(null);
    setRecMsg(null);
  }

  async function onDownloadRecords() {
    setRecBusy(true);
    setRecMsg(null);
    try {
      await downloadRecordsXlsx();
      setRecMsg(t("dl.downloadStarted"));
    } catch (err) {
      setRecMsg((err as Error).message);
    } finally {
      setRecBusy(false);
    }
  }

  return (
    <div className="dl-wrap">
      <a className="dl-btn dl-btn-ghost dl-backlink" href="/">
        {t("dl.back")}
      </a>

      <header className="dl-header">
        <div className="dl-header__bar">
          <h1>{t("dl.title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="dl-sub">{t("dl.sub")}</p>
      </header>

      {/* ---- 篩選快照 (公開) ---- */}
      <section className="dl-card">
        <div className="dl-card-head">
          <h2>{t("dl.snapshotsTitle")}</h2>
          <button className="dl-btn dl-btn-ghost" onClick={refreshCoverage} disabled={loading}>
            {loading ? t("common.loading") : t("dl.refresh")}
          </button>
        </div>

        {error && <p className="dl-error">{t("dl.loadFailed", { msg: error })}</p>}

        {coverage && coverage.totalSnapshots > 0 ? (
          <p className="dl-hint dl-coverage">
            {t("dl.coverage", {
              min: coverage.minDate ?? "",
              max: coverage.maxDate ?? "",
              days: coverage.tradingDays,
              total: coverage.totalSnapshots,
              size: formatBytes(coverage.dbSizeBytes),
            })}
          </p>
        ) : (
          !loading && !error && <p className="dl-hint">{t("dl.coverageUnknown")}</p>
        )}

        <form className="dl-query" onSubmit={onQuery}>
          <label>
            {t("dl.rangeStart")}
            <input
              type="date"
              value={rangeStart}
              max={rangeEnd}
              onChange={(e) => {
                setRangeStart(e.target.value);
                setRangeRows(null);
              }}
              required
            />
          </label>
          <label>
            {t("dl.rangeEnd")}
            <input
              type="date"
              value={rangeEnd}
              min={rangeStart}
              max={todayStr()}
              onChange={(e) => {
                setRangeEnd(e.target.value);
                setRangeRows(null);
              }}
              required
            />
          </label>
          <label>
            {t("dl.session")}
            <select
              value={querySession}
              onChange={(e) => {
                setQuerySession(e.target.value as SessionName);
                setRangeRows(null);
              }}
            >
              <option value="intraday_1300">{t("dl.th.intraday")}</option>
              <option value="eod">{t("dl.th.eod")}</option>
            </select>
          </label>
          <button
            className="dl-btn"
            type="submit"
            disabled={queryBusy || !rangeStart || !rangeEnd || rangeStart > rangeEnd}
          >
            {queryBusy ? t("common.loading") : t("dl.query")}
          </button>
        </form>

        {queryError && <p className="dl-error">{t("dl.loadFailed", { msg: queryError })}</p>}

        {!queryError && rangeRows && (
          rangeRows.length > 0 ? (
            <p className="dl-row dl-query-result">
              <span>
                {t("dl.rangeFound", {
                  days: rangeRows.length,
                  count: rangeRows.reduce((sum, s) => sum + s.item_count, 0),
                })}
              </span>
              <a
                className="dl-btn dl-btn-sm"
                href={snapshotsRangeXlsxUrl(rangeStart, rangeEnd, querySession)}
              >
                {t("dl.downloadRange")}
              </a>
            </p>
          ) : (
            <p className="dl-muted">{t("dl.rangeNotFound")}</p>
          )
        )}

        <p className="dl-hint">{t("dl.snapshotHint")}</p>
      </section>

      {/* ---- 我的紀錄 (需登入) ---- */}
      <section className="dl-card">
        <div className="dl-card-head">
          <h2>{t("dl.recordsTitle")}</h2>
        </div>

        {user ? (
          <div className="dl-records">
            <p className="dl-muted">
              {t("dl.loggedInAs")}<strong>{user.displayName || user.email}</strong>
            </p>
            <div className="dl-row">
              <button className="dl-btn" onClick={onDownloadRecords} disabled={recBusy}>
                {recBusy ? t("dl.downloading") : t("dl.downloadRecords")}
              </button>
              <button className="dl-btn dl-btn-ghost" onClick={onLogout}>{t("dl.logout")}</button>
            </div>
            {recMsg && <p className="dl-hint">{recMsg}</p>}
          </div>
        ) : (
          <form className="dl-login" onSubmit={onLogin}>
            <p className="dl-muted">{t("dl.loginRequired")}</p>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              {t("dl.password")}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {authError && <p className="dl-error">{authError}</p>}
            <button className="dl-btn" type="submit" disabled={authBusy}>
              {authBusy ? t("dl.loggingIn") : t("dl.login")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
