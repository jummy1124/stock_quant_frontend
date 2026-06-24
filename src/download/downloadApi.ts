// src/download/downloadApi.ts
//
// Self-contained API client for the standalone download page. It deliberately
// imports nothing from the rest of the app (../api, ../auth, ...): the whole
// src/download/ folder + download.html can be lifted into its own project and
// keep working, as long as the backend exposes the same /downloadapi + /userapi
// contract on the same origin (or VITE_API_BASE_URL).
//
// Access model:
//   - Screening snapshots are PUBLIC -> plain links, no token.
//   - Records download requires the user JWT -> login here, send Bearer header.

const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

const TOKEN_KEY = "downloadpage_token";

export type SessionName = "intraday_1300" | "eod";

export interface SnapshotMeta {
  trade_date: string; // YYYY-MM-DD
  session: SessionName;
  generated_at: string; // ISO
  source: string; // live | eod
  universe: number;
  quotable: number;
  pool_size: number;
  item_count: number;
  warning: string | null;
}

export interface DownloadUser {
  id: string;
  email: string;
  displayName: string | null;
}

// ---- token (kept independent from the main app's userapi_token) ----

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: ignore */
  }
}

// ---- public: snapshot listing ----

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const res = await fetch(`${API_BASE}/downloadapi/snapshots`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`載入快照清單失敗 (HTTP ${res.status})`);
  const body = (await res.json()) as { snapshots: SnapshotMeta[] };
  return body.snapshots ?? [];
}

/** Public snapshot .xlsx URL — safe to use directly as an <a href> (no auth). */
export function snapshotXlsxUrl(date: string, session: SessionName): string {
  const qs = new URLSearchParams({ date, session });
  return `${API_BASE}/downloadapi/snapshot.xlsx?${qs.toString()}`;
}

// ---- auth (reuses the existing userdata backend) ----

export async function login(email: string, password: string): Promise<DownloadUser> {
  const res = await fetch(`${API_BASE}/userapi/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) throw new Error("帳號或密碼錯誤");
  if (!res.ok) throw new Error(`登入失敗 (HTTP ${res.status})`);
  const data = (await res.json()) as {
    token: string;
    user: { id: string; email: string; display_name: string | null };
  };
  setToken(data.token);
  return {
    id: data.user.id,
    email: data.user.email,
    displayName: data.user.display_name,
  };
}

/** Restore the logged-in user after a reload; null if no/invalid token. */
export async function currentUser(): Promise<DownloadUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/userapi/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    setToken(null);
    return null;
  }
  const u = (await res.json()) as {
    id: string;
    email: string;
    display_name: string | null;
  };
  return { id: u.id, email: u.email, displayName: u.display_name };
}

export function logout(): void {
  setToken(null);
}

// ---- private: records .xlsx (needs Bearer header -> fetch + blob download) ----

export async function downloadRecordsXlsx(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("尚未登入");
  const res = await fetch(`${API_BASE}/downloadapi/records.xlsx`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    setToken(null);
    throw new Error("登入已過期，請重新登入");
  }
  if (!res.ok) throw new Error(`下載失敗 (HTTP ${res.status})`);
  const blob = await res.blob();
  triggerBlobDownload(blob, "my_records.xlsx");
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
