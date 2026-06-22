// src/components/auth/RegisterForm.tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";

export function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErr(null);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
    } catch (e2) {
      setErr((e2 as Error).message || "註冊失敗");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-form__title">註冊</h2>

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
        <span>顯示名稱（選填）</span>
        <input
          type="text"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="例如：阿明"
        />
      </label>

      <label className="auth-field">
        <span>密碼</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="至少 6 碼"
        />
      </label>

      {err && <p className="auth-error" role="alert">{err}</p>}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "註冊中…" : "註冊"}
      </button>

      <p className="auth-switch">
        已經有帳號？
        <button type="button" className="auth-link" onClick={onSwitch}>
          登入
        </button>
      </p>
    </form>
  );
}
