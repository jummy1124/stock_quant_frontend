// src/auth/AuthContext.tsx
// 認證狀態：持有 user / token / status，提供 login / register / logout。
// - 啟動時若 localStorage 有 token（userClient 已載入），呼叫 /me 還原登入。
// - 登入成功 setAuthToken(token)；登出 setAuthToken(null)。
// - 註冊 userClient 的 onUnauthorized：任一請求收到 401 時自動登出並提示。
// - 另外提供信箱驗證相關動作：resendVerification（重寄驗證信）、
//   applyAuthResult（重設密碼頁完成後直接登入）、markVerified（驗證完成後同步狀態）。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthResult } from "../api/authApi";
import type { AuthStatus, User } from "./types";
import * as authApi from "../api/authApi";
import { getAuthToken, onUnauthorized, setAuthToken } from "../api/userClient";
import { useToast } from "../components/ui/Toast";
import { useT } from "../i18n";

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 重寄驗證信給自己；回傳後端的訊息字串 */
  resendVerification: () => Promise<string>;
  /** 把一組 { token, user } 直接套用成登入狀態（重設密碼完成後用） */
  applyAuthResult: (result: AuthResult) => void;
  /**
   * 在不重新請求的情況下把目前使用者標記為已驗證。
   * 驗證頁與主畫面可能是同一個分頁，驗證成功後直接收掉提醒橫幅。
   */
  markVerified: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const toast = useToast();
  const t = useT();

  // 用 ref 保存最新 status，供 onUnauthorized handler 判斷是否需提示
  const statusRef = useRef<AuthStatus>(status);
  statusRef.current = status;

  // 啟動：嘗試用既有 token 還原登入
  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }
    void (async () => {
      try {
        const u = await authApi.me();
        if (cancelled) return;
        setUser(u);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        setAuthToken(null);
        setUser(null);
        setStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 任一 /userapi 請求回 401：清狀態並提示（僅在原本已登入時提示，避免雜訊）
  useEffect(() => {
    const off = onUnauthorized(() => {
      const wasAuthed = statusRef.current === "authenticated";
      setUser(null);
      setStatus("anonymous");
      if (wasAuthed) toast.error(t("auth.expired"));
    });
    return off;
  }, [toast, t]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { token, user: u } = await authApi.register(email, password, displayName);
      setAuthToken(token);
      setUser(u);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setAuthToken(null);
    setUser(null);
    setStatus("anonymous");
    toast.info(t("toast.loggedOut"));
  }, [toast, t]);

  const resendVerification = useCallback(() => authApi.resendVerification(), []);

  const applyAuthResult = useCallback(({ token, user: u }: AuthResult) => {
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const markVerified = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
  }, []);

  const api = useMemo<AuthCtx>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
      resendVerification,
      applyAuthResult,
      markVerified,
    }),
    [
      status,
      user,
      login,
      register,
      logout,
      resendVerification,
      applyAuthResult,
      markVerified,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth 必須在 <AuthProvider> 內使用");
  return c;
}
