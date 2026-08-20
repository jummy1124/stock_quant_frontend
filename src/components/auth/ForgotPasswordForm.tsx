// src/components/auth/ForgotPasswordForm.tsx
// 「忘記密碼」表單：送出信箱 → 後端寄出重設連結。
//
// 重點：不論該信箱有沒有註冊，後端都回同一個 202 + 同一句話。這裡照樣呈現，
// 不做任何「查無此帳號」的分支 —— 否則等於把後端刻意堵掉的帳號列舉管道
// 在前端重新開一個。送出後直接切成「已寄出」畫面，連 loading 之外的線索都不留。
import { useState, type FormEvent } from "react";
import * as authApi from "../../api/authApi";
import { useT } from "../../i18n";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErr(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e2) {
      // 只有網路錯誤或 429 會走到這裡；「查無帳號」不會。
      setErr((e2 as Error).message || t("auth.forgotFailed"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-form">
        <h2 className="auth-form__title">{t("auth.forgotSentTitle")}</h2>
        <p className="auth-notice">{t("auth.forgotSentBody", { email: email.trim() })}</p>
        <p className="auth-hint">{t("auth.forgotSentHint")}</p>
        <button type="button" className="auth-submit" onClick={onBack}>
          {t("auth.backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-form__title">{t("auth.forgotTitle")}</h2>
      <p className="auth-hint">{t("auth.forgotLead")}</p>

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

      {err && (
        <p className="auth-error" role="alert">
          {err}
        </p>
      )}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? t("auth.forgotSending") : t("auth.forgotSubmit")}
      </button>

      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={onBack}>
          {t("auth.backToLogin")}
        </button>
      </p>
    </form>
  );
}
