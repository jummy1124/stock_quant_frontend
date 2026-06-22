// src/api/userClient.ts
// 多人版「使用者資料」服務的共用 HTTP client。
// 所有 /userapi 請求都經過這裡：統一 base URL、自動帶 JWT、集中處理 401、逾時與錯誤擷取。
// dev 期間可直連真後端（vite proxy → localhost:8100），或由 MSW 攔截（見 src/mocks）。
import { API_BASE_URL } from "./screen";

/** 使用者資料服務的路徑前綴（正式環境由 nginx /userapi 反代到新後端） */
export const USER_API_PREFIX = "/userapi";

/** localStorage 中保存 JWT 的鍵；重整後仍維持登入 */
const TOKEN_KEY = "userapi_token";

/** 預設請求逾時（毫秒）；可由 userJson 的 options.timeoutMs 覆寫 */
const DEFAULT_TIMEOUT_MS = 15_000;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let authToken: string | null = readStoredToken();

/** 登入後 setAuthToken(jwt)，登出 setAuthToken(null)；同時同步到 localStorage */
export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage 不可用（如隱私模式）時，至少保留記憶體中的 token
  }
}

/** 目前的 token（AuthContext 初始化還原登入時可用） */
export function getAuthToken(): string | null {
  return authToken;
}

// ---- 401 處理：用註冊機制通知 AuthContext，避免 client 直接依賴 React ----

type UnauthorizedHandler = () => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

/**
 * 註冊「收到 401」的回呼（AuthContext 用來登出 + 導向登入）。
 * 回傳一個取消註冊的函式。
 */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function emitUnauthorized(): void {
  for (const h of unauthorizedHandlers) {
    try {
      h();
    } catch {
      // 單一 handler 失敗不影響其他
    }
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 逾時錯誤（AbortController 觸發）；呼叫端可視為網路問題 */
export class TimeoutError extends Error {
  constructor(message = "請求逾時") {
    super(message);
    this.name = "TimeoutError";
  }
}

export interface UserRequestOptions extends RequestInit {
  /** 覆寫此次請求的逾時（毫秒）；<=0 表示不逾時 */
  timeoutMs?: number;
}

/** 合併外部 signal 與逾時 signal */
function withTimeout(
  external: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void; didTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timer) clearTimeout(timer);
      if (external) external.removeEventListener("abort", onExternalAbort);
    },
    didTimeout: () => timedOut,
  };
}

async function userFetch(path: string, init: UserRequestOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");
  if (rest.body != null) headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const { signal, cleanup, didTimeout } = withTimeout(externalSignal, timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${USER_API_PREFIX}${path}`, { ...rest, headers, signal });
  } catch (e) {
    if (didTimeout()) throw new TimeoutError();
    if ((e as Error)?.name === "AbortError") throw e; // 外部主動取消
    throw new ApiError(0, "網路連線失敗");
  } finally {
    cleanup();
  }

  if (res.status === 401) {
    // 清 token 並通知 AuthContext 登出 / 導向登入。
    setAuthToken(null);
    emitUnauthorized();
  }
  return res;
}

/** 發請求並解析 JSON；非 2xx 丟 ApiError；204 回 undefined */
export async function userJson<T>(path: string, init?: UserRequestOptions): Promise<T> {
  const res = await userFetch(path, init);
  if (!res.ok) {
    let detail = `API ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // 忽略非 JSON 錯誤內容
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
