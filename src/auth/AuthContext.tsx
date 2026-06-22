// src/auth/AuthContext.tsx
// 認證狀態：持有 user / token / status，提供 login / register / logout。
// - 啟動時若 localStorage 有 token（userClient 已載入），呼叫 /me 還原登入。
// - 登入成功 setAuthToken(token)；登出 setAuthToken(null)。
// - 註冊 userClient 的 onUnauthorized：任一請求收到 401 時自動登出並提示。
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
import type { AuthStatus, User } from "./types";
import * as authApi from "../api/authApi";
import { getAuthToken, onUnauthorized, setAuthToken } from "../api/userClient";
import { useToast } from "../components/ui/Toast";

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const toast = useToast();

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
      if (wasAuthed) toast.error("登入已過期，請重新登入");
    });
    return off;
  }, [toast]);

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
    toast.info("已登出");
  }, [toast]);

  const api = useMemo<AuthCtx>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
    }),
    [status, user, login, register, logout],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth 必須在 <AuthProvider> 內使用");
  return c;
}
