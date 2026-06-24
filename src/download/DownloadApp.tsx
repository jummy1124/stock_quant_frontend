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
  if (!snap) return <span className="dl-muted">—</span>;
  return (
    <a className="dl-btn dl-btn-sm" href={snapshotXlsxUrl(date, session)}>
      下載 ({snap.item_count})
    </a>
  );
}

export default function DownloadApp() {
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
      setRecMsg("已開始下載 my_records.xlsx");
    } catch (err) {
      setRecMsg((err as Error).message);
    } finally {
      setRecBusy(false);
    }
  }

  return (
    <div className="dl-wrap">
      <header className="dl-header">
        <h1>台股篩選資料下載</h1>
        <p className="dl-sub">
          下載每日篩選結果與自己的個股紀錄。篩選結果為資訊參考，非投資建議。
        </p>
      </header>

      {/* ---- 篩選快照 (公開) ---- */}
      <section className="dl-card">
        <div className="dl-card-head">
          <h2>每日篩選快照</h2>
          <button className="dl-btn dl-btn-ghost" onClick={refreshSnapshots} disabled={loading}>
            {loading ? "載入中…" : "重新整理"}
          </button>
        </div>

        {error && <p className="dl-error">載入失敗：{error}</p>}
        {!error && !loading && days.length === 0 && (
          <p className="dl-muted">目前尚無任何篩選快照。</p>
        )}

        {days.length > 0 && (
          <table className="dl-table">
            <thead>
              <tr>
                <th>交易日</th>
                <th>盤中 13:00</th>
                <th>收盤後</th>
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
        <p className="dl-hint">「下載」旁的數字為當次篩出的起漲個股檔數。檔案為 Excel (.xlsx)。</p>
      </section>

      {/* ---- 我的紀錄 (需登入) ---- */}
      <section className="dl-card">
        <div className="dl-card-head">
          <h2>我的個股紀錄</h2>
        </div>

        {user ? (
          <div className="dl-records">
            <p className="dl-muted">
              已登入：<strong>{user.displayName || user.email}</strong>
            </p>
            <div className="dl-row">
              <button className="dl-btn" onClick={onDownloadRecords} disabled={recBusy}>
                {recBusy ? "下載中…" : "下載我的紀錄 (.xlsx)"}
              </button>
              <button className="dl-btn dl-btn-ghost" onClick={onLogout}>登出</button>
            </div>
            {recMsg && <p className="dl-hint">{recMsg}</p>}
          </div>
        ) : (
          <form className="dl-login" onSubmit={onLogin}>
            <p className="dl-muted">下載個人紀錄需先登入。</p>
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
              密碼
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
              {authBusy ? "登入中…" : "登入"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
