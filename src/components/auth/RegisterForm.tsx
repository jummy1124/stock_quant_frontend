// src/components/auth/RegisterForm.tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useT } from "../../i18n";

export function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useAuth();
  const t = useT();
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
      setErr((e2 as Error).message || t("auth.registerFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-form__title">{t("auth.register")}</h2>

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
        <span>{t("auth.displayName")}</span>
        <input
          type="text"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("auth.displayNamePlaceholder")}
        />
      </label>

      <label className="auth-field">
        <span>{t("auth.password")}</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder={t("auth.passwordPlaceholder")}
        />
      </label>

      {err && <p className="auth-error" role="alert">{err}</p>}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? t("auth.registering") : t("auth.register")}
      </button>

      <p className="auth-switch">
        {t("auth.haveAccount")}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t("auth.login")}
        </button>
      </p>
    </form>
  );
}
