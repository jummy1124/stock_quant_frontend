// src/api/authApi.ts
// 認證端點封裝：login / register / me / logout，全部透過共用的 userJson 打 /userapi/auth/*。
// 後端回傳 snake_case（user.display_name），在此轉成前端的 camelCase User。
import type { User } from "../auth/types";
import { userJson } from "./userClient";

interface ServerUser {
  id: string;
  email: string;
  display_name: string | null;
}

interface AuthResponse {
  token: string;
  user: ServerUser;
}

export interface AuthResult {
  token: string;
  user: User;
}

function fromServerUser(u: ServerUser): User {
  return { id: u.id, email: u.email, displayName: u.display_name ?? null };
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  const body = JSON.stringify({
    email,
    password,
    ...(displayName ? { display_name: displayName } : {}),
  });
  const data = await userJson<AuthResponse>("/auth/register", { method: "POST", body });
  return { token: data.token, user: fromServerUser(data.user) };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const body = JSON.stringify({ email, password });
  const data = await userJson<AuthResponse>("/auth/login", { method: "POST", body });
  return { token: data.token, user: fromServerUser(data.user) };
}

/** 取目前登入者（用於重整後還原 session）；token 無效時 userJson 會丟 401 ApiError */
export async function me(): Promise<User> {
  const u = await userJson<ServerUser>("/me");
  return fromServerUser(u);
}

/** 後端為 no-op（純前端丟 token），呼叫失敗也不影響本地登出 */
export async function logout(): Promise<void> {
  try {
    await userJson<void>("/auth/logout", { method: "POST" });
  } catch {
    // 忽略：登出以前端清除 token 為準
  }
}
