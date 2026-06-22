// src/components/auth/LoginForm.tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";

export function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErr(null);
    try {
      await login(email.trim(), password);
    } catch (e2) {
      setErr((e2 as Error).message || "登入失敗");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-form__title">登入</h2>

      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="auth-field">
        <span>密碼</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
      </label>

      {err && <p className="auth-error" role="alert">{err}</p>}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "登入中…" : "登入"}
      </button>

      <p className="auth-switch">
        還沒有帳號？
        <button type="button" className="auth-link" onClick={onSwitch}>
          註冊
        </button>
      </p>
    </form>
  );
}
