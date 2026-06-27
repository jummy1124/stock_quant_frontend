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

interface DayRow {
  date: string;
  intraday?: SnapshotMeta;
  eod?: SnapshotMeta;
}

function groupByDate(snaps: SnapshotMeta[]): DayRow[] {
  const map = new Map<string, DayRow>();
  for (const s of snaps) {
    const row = map.get(s.trade_date) ?? { date: s.trade_date };
    if (s.session === "intraday_1300") row.intraday = s;
    else if (s.session === "eod") row.eod = s;
    map.set(s.trade_date, row);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function SessionCell({ snap, date, session }: {
  snap?: SnapshotMeta;
  date: string;
  session: SessionName;
}) {
  const { t } = useI18n();
  if (!snap) return <span className="dl-muted">—</span>;
  return (
    <a className="dl-btn dl-btn-sm" href={snapshotXlsxUrl(date, session)}>
      {t("dl.download", { count: snap.item_count })}
    </a>
  );
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

  const days = useMemo(() => groupByDate(snaps ?? []), [snaps]);

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
        {!error && !loading && days.length === 0 && (
          <p className="dl-muted">{t("dl.noSnapshots")}</p>
        )}

        {days.length > 0 && (
          <table className="dl-table">
            <thead>
              <tr>
                <th>{t("dl.th.date")}</th>
                <th>{t("dl.th.intraday")}</th>
                <th>{t("dl.th.eod")}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="dl-date">{d.date}</td>
                  <td><SessionCell snap={d.intraday} date={d.date} session="intraday_1300" /></td>
                  <td><SessionCell snap={d.eod} date={d.date} session="eod" /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
