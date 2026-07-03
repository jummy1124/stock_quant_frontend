// src/download/DownloadApp.tsx
//
// Standalone "資料下載" page. Self-contained (only depends on ./downloadApi and
// React) so it can be extracted into its own project. Two areas:
//   1. 篩選快照 (公開)：每個交易日的「盤中13:00」與「收盤後」起漲篩選結果，直接下載 .xlsx。
//   2. 我的紀錄 (需登入)：登入後下載自己記錄的個股 .xlsx。
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  currentUser,
  downloadRecordsXlsx,
  listSnapshots,
  login,
  logout,
  snapshotXlsxUrl,
  type DownloadUser,
  type SessionName,
  type SnapshotMeta,
} from "./downloadApi";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

interface Coverage {
  min: string;
  max: string;
  days: number;
  total: number;
}

function computeCoverage(snaps: SnapshotMeta[]): Coverage | null {
  if (snaps.length === 0) return null;
  let min = snaps[0].trade_date;
  let max = snaps[0].trade_date;
  const dateSet = new Set<string>();
  for (const s of snaps) {
    if (s.trade_date < min) min = s.trade_date;
    if (s.trade_date > max) max = s.trade_date;
    dateSet.add(s.trade_date);
  }
  return { min, max, days: dateSet.size, total: snaps.length };
}

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function DownloadApp() {
  const { t } = useI18n();
  const [snaps, setSnaps] = useState<SnapshotMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<DownloadUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recMsg, setRecMsg] = useState<string | null>(null);

  const [queryDate, setQueryDate] = useState(todayStr());
  const [querySession, setQuerySession] = useState<SessionName>("eod");
  const [queried, setQueried] = useState(false);

  async function refreshSnapshots() {
    setLoading(true);
    setError(null);
    try {
      setSnaps(await listSnapshots());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSnapshots();
    void currentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.title = t("dl.docTitle");
  }, [t]);

  const coverage = useMemo(() => computeCoverage(snaps ?? []), [snaps]);

  const snapMap = useMemo(() => {
    const map = new Map<string, SnapshotMeta>();
    for (const s of snaps ?? []) map.set(`${s.trade_date}|${s.session}`, s);
    return map;
  }, [snaps]);

  const queryResult = snapMap.get(`${queryDate}|${querySession}`);

  function onQuery(e: FormEvent) {
    e.preventDefault();
    setQueried(true);
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
          <button className="dl-btn dl-btn-ghost" onClick={refreshSnapshots} disabled={loading}>
            {loading ? t("common.loading") : t("dl.refresh")}
          </button>
        </div>

        {error && <p className="dl-error">{t("dl.loadFailed", { msg: error })}</p>}

        {coverage ? (
          <p className="dl-hint dl-coverage">
            {t("dl.coverage", {
              min: coverage.min,
              max: coverage.max,
              days: coverage.days,
              total: coverage.total,
            })}
          </p>
        ) : (
          !loading && !error && <p className="dl-hint">{t("dl.coverageUnknown")}</p>
        )}

        <form className="dl-query" onSubmit={onQuery}>
          <label>
            {t("dl.th.date")}
            <input
              type="date"
              value={queryDate}
              max={todayStr()}
              onChange={(e) => {
                setQueryDate(e.target.value);
                setQueried(false);
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
                setQueried(false);
              }}
            >
              <option value="intraday_1300">{t("dl.th.intraday")}</option>
              <option value="eod">{t("dl.th.eod")}</option>
            </select>
          </label>
          <button className="dl-btn" type="submit" disabled={loading || !queryDate}>
            {t("dl.query")}
          </button>
        </form>

        {queried && !error && (
          queryResult ? (
            <p className="dl-row dl-query-result">
              <span>{t("dl.queryFound", { count: queryResult.item_count })}</span>
              <a className="dl-btn dl-btn-sm" href={snapshotXlsxUrl(queryDate, querySession)}>
                {t("dl.download", { count: queryResult.item_count })}
              </a>
            </p>
          ) : (
            <p className="dl-muted">{t("dl.queryNotFound")}</p>
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
