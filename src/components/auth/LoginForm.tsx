// src/components/auth/LoginForm.tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useT } from "../../i18n";

export function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth();
  const t = useT();
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
      setErr((e2 as Error).message || t("auth.loginFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-form__title">{t("auth.login")}</h2>

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
        <span>{t("auth.password")}</span>
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
        {pending ? t("auth.loggingIn") : t("auth.login")}
      </button>

      <p className="auth-switch">
        {t("auth.noAccount")}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t("auth.register")}
        </button>
      </p>
    </form>
  );
}
