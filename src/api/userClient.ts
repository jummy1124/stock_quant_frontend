// src/api/userClient.ts
// 多人版「使用者資料」服務的共用 HTTP client。
// 所有 /userapi 請求都經過這裡：統一 base URL、之後自動帶 JWT、集中處理 401。
// dev 期間請求會被 MSW 攔截（見 src/mocks），不需要真的後端。
import { API_BASE_URL } from "./screen";

/** 使用者資料服務的路徑前綴（正式環境由 nginx /userapi 反代到新後端） */
export const USER_API_PREFIX = "/userapi";

let authToken: string | null = null;

/** 之後接 AuthContext：登入後 setAuthToken(jwt)，登出 setAuthToken(null) */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function userFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body != null) headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${USER_API_PREFIX}${path}`, { ...init, headers });

  if (res.status === 401) {
    // TODO(auth): 清 token 並導向登入頁（接 AuthContext 後補）
    setAuthToken(null);
  }
  return res;
}

/** 發請求並解析 JSON；非 2xx 丟 ApiError；204 回 undefined */
export async function userJson<T>(path: string, init?: RequestInit): Promise<T> {
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
