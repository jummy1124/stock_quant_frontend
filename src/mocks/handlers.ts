// src/mocks/handlers.ts
// MSW 攔截器：在「沒有真後端」時，於瀏覽器端假裝 /userapi 的 auth + 個股紀錄。
// 僅在 VITE_ENABLE_MSW=true 時啟用（見 src/main.tsx）。用 localStorage 模擬持久化。
// 紀錄以「使用者」隔離（依 Bearer token 解出的 userId），行為貼近真後端。
import { http, HttpResponse } from "msw";

// ============================================================
// 假帳號表 + token
// ============================================================

interface MockUser {
  id: string;
  email: string;
  password: string;
  display_name: string | null;
}

const LS_USERS = "mock_userdata_users_v1";
const LS_RECORDS = "mock_userdata_records_v2"; // v2：改為 per-user 結構
const TOKEN_PREFIX = "mock-token-";

function loadUsers(): Record<string, MockUser> {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || "{}") as Record<string, MockUser>;
  } catch {
    return {};
  }
}
function saveUsers(u: Record<string, MockUser>): void {
  localStorage.setItem(LS_USERS, JSON.stringify(u));
}

function publicUser(u: MockUser) {
  return { id: u.id, email: u.email, display_name: u.display_name };
}

function tokenFor(userId: string): string {
  return `${TOKEN_PREFIX}${userId}`;
}

/** 從 Authorization header 取出 userId，無效則回 null */
function userIdFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const id = token.slice(TOKEN_PREFIX.length);
  const users = loadUsers();
  return Object.values(users).some((u) => u.id === id) ? id : null;
}

const unauthorized = () => HttpResponse.json({ detail: "未授權" }, { status: 401 });

// ============================================================
// 個股紀錄（per-user）
// ============================================================

interface ServerRecord {
  symbol: string;
  name: string;
  market: string;
  market_code: string;
  target_price: number | null;
  cost_price: number | null;
  last_close: number | null;
  updated_at: string;
}

const keyOf = (mc: string, s: string) => `${mc}-${s}`;

function loadAllRecords(): Record<string, Record<string, ServerRecord>> {
  try {
    return JSON.parse(localStorage.getItem(LS_RECORDS) || "{}") as Record<
      string,
      Record<string, ServerRecord>
    >;
  } catch {
    return {};
  }
}
function saveAllRecords(s: Record<string, Record<string, ServerRecord>>): void {
  localStorage.setItem(LS_RECORDS, JSON.stringify(s));
}
function userRecords(userId: string): Record<string, ServerRecord> {
  return loadAllRecords()[userId] ?? {};
}
function setUserRecords(userId: string, recs: Record<string, ServerRecord>): void {
  const all = loadAllRecords();
  all[userId] = recs;
  saveAllRecords(all);
}

interface UpsertBody {
  name?: string;
  market?: string;
  target_price?: number | null;
  cost_price?: number | null;
  last_close?: number | null;
}

interface RegisterBody {
  email?: string;
  password?: string;
  display_name?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

export const handlers = [
  // -------- auth --------
  http.post("/userapi/auth/register", async ({ request }) => {
    const body = (await request.json()) as RegisterBody;
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return HttpResponse.json({ detail: "缺少 email 或密碼" }, { status: 422 });
    }
    const users = loadUsers();
    if (users[email]) {
      return HttpResponse.json({ detail: "Email 已被註冊" }, { status: 409 });
    }
    const user: MockUser = {
      id: crypto.randomUUID(),
      email,
      password,
      display_name: body.display_name?.trim() || null,
    };
    users[email] = user;
    saveUsers(users);
    return HttpResponse.json({ token: tokenFor(user.id), user: publicUser(user) }, { status: 201 });
  }),

  http.post("/userapi/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginBody;
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const users = loadUsers();
    const user = users[email];
    if (!user || user.password !== password) {
      return HttpResponse.json({ detail: "帳號或密碼錯誤" }, { status: 401 });
    }
    return HttpResponse.json({ token: tokenFor(user.id), user: publicUser(user) });
  }),

  http.post("/userapi/auth/logout", () => new HttpResponse(null, { status: 204 })),

  http.get("/userapi/me", ({ request }) => {
    const userId = userIdFromRequest(request);
    if (!userId) return unauthorized();
    const user = Object.values(loadUsers()).find((u) => u.id === userId);
    if (!user) return unauthorized();
    return HttpResponse.json(publicUser(user));
  }),

  // -------- records (需登入) --------
  http.get("/userapi/records", ({ request }) => {
    const userId = userIdFromRequest(request);
    if (!userId) return unauthorized();
    return HttpResponse.json({ records: Object.values(userRecords(userId)) });
  }),

  http.put("/userapi/records/:market/:symbol", async ({ params, request }) => {
    const userId = userIdFromRequest(request);
    if (!userId) return unauthorized();
    const marketCode = String(params.market);
    const symbol = String(params.symbol);
    const body = (await request.json()) as UpsertBody;
    const rec: ServerRecord = {
      symbol,
      name: body.name ?? "",
      market: body.market ?? "",
      market_code: marketCode,
      target_price: body.target_price ?? null,
      cost_price: body.cost_price ?? null,
      last_close: body.last_close ?? null,
      updated_at: new Date().toISOString(),
    };
    const recs = userRecords(userId);
    recs[keyOf(marketCode, symbol)] = rec;
    setUserRecords(userId, recs);
    return HttpResponse.json(rec);
  }),

  http.delete("/userapi/records/:market/:symbol", ({ params, request }) => {
    const userId = userIdFromRequest(request);
    if (!userId) return unauthorized();
    const recs = userRecords(userId);
    delete recs[keyOf(String(params.market), String(params.symbol))];
    setUserRecords(userId, recs);
    return new HttpResponse(null, { status: 204 });
  }),
];
