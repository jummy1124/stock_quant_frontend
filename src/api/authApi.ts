// src/api/authApi.ts
// 認證端點封裝：login / register / me / logout，以及信箱驗證與忘記密碼流程，
// 全部透過共用的 userJson 打 /userapi/auth/*。
// 後端回傳 snake_case（user.display_name / email_verified），在此轉成前端的 camelCase User。
import type { User } from "../auth/types";
import { userJson } from "./userClient";

interface ServerUser {
  id: string;
  email: string;
  display_name: string | null;
  email_verified?: boolean;
}

interface AuthResponse {
  token: string;
  user: ServerUser;
}

interface MessageResponse {
  message: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

function fromServerUser(u: ServerUser): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name ?? null,
    // 舊版後端沒有這個欄位；當成「已驗證」才不會對著舊部署一直顯示提醒橫幅。
    emailVerified: u.email_verified ?? true,
  };
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

// ---------------------------------------------------------------------------
// 信箱驗證
// ---------------------------------------------------------------------------

/**
 * 用信中連結的 token 驗證信箱。
 * 不需要登入 —— 使用者常在另一個瀏覽器（甚至手機）點開連結，
 * 「持有這個 token」本身就是所有權證明。
 */
export async function verifyEmail(token: string): Promise<User> {
  const body = JSON.stringify({ token });
  const u = await userJson<ServerUser>("/auth/verify-email", { method: "POST", body });
  return fromServerUser(u);
}

/** 重寄驗證信給「目前登入者自己的信箱」（需登入，故無法指定他人信箱）。 */
export async function resendVerification(): Promise<string> {
  const data = await userJson<MessageResponse>("/auth/resend-verification", {
    method: "POST",
  });
  return data.message;
}

// ---------------------------------------------------------------------------
// 忘記 / 重設密碼
// ---------------------------------------------------------------------------

/**
 * 請求重設密碼信。
 *
 * 後端對「有註冊」與「沒註冊」的信箱回傳完全相同的內容（202 + 同一句話），
 * 前端也必須照樣呈現、不做任何額外判斷 —— 否則就等於把後端刻意做掉的
 * 帳號列舉管道又在前端開回來。
 */
export async function forgotPassword(email: string): Promise<string> {
  const body = JSON.stringify({ email });
  const data = await userJson<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body,
  });
  return data.message;
}

/** 用信中連結的 token 設定新密碼；成功後後端直接發新 token，等同登入。 */
export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthResult> {
  const body = JSON.stringify({ token, password });
  const data = await userJson<AuthResponse>("/auth/reset-password", {
    method: "POST",
    body,
  });
  return { token: data.token, user: fromServerUser(data.user) };
}
