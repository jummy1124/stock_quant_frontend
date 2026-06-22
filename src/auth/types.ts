// src/auth/types.ts
// 帳號 / 登入相關的前端模型型別（camelCase）。
// 後端 /userapi 以 snake_case 回傳（user.display_name），由 authApi 轉成 camelCase。

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

/** 認證狀態機：啟動時先 loading（嘗試還原 token），之後為已登入 / 未登入 */
export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
}
