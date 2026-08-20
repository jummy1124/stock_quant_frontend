// src/components/auth/ResetPasswordPage.tsx
// 使用者從信件點進 /?reset=<token> 時顯示的整頁畫面。
//
// 成功後後端會直接回一組新的 JWT（重設密碼已證明信箱所有權），所以這裡
// applyAuthResult 讓使用者直接進入登入狀態，不必再打一次登入。
//
// 完成後把 ?reset= 從網址移除（history.replaceState）：token 已用掉，留在網址列
// 只會出現在瀏覽器歷史、書籤與之後外連的 Referer 裡。
import { useState, type FormEvent } from "react";
import * as authApi from "../../api/authApi";
import { useAuth } from "../../auth/AuthContext";
import { useT } from "../../i18n";
import { PASSWORD_MIN_LEN } from "./passwordPolicy";

export function ResetPasswordPage({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const t = useT();
  const { applyAuthResult } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password !== confirm) {
      setErr(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      setErr(t("auth.passwordTooShort", { n: PASSWORD_MIN_LEN }));
      return;
    }
    setPending(true);
    setErr(null);
    try {
      const result = await authApi.resetPassword(token, password);
      applyAuthResult(result);
      setDone(true);
    } catch (e2) {
      setErr((e2 as Error).message || t("auth.resetFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-standalone">
      <div className="auth-card">
        {done ? (
          <div className="auth-form">
            <h2 className="auth-form__title">{t("auth.resetDoneTitle")}</h2>
            <p className="auth-notice">{t("auth.resetDoneBody")}</p>
            <button type="button" className="auth-submit" onClick={onDone}>
              {t("auth.continueToApp")}
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <h2 className="auth-form__title">{t("auth.resetTitle")}</h2>
            <p className="auth-hint">{t("auth.resetLead")}</p>

            <label className="auth-field">
              <span>{t("auth.newPassword")}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LEN}
                placeholder={t("auth.passwordPlaceholder")}
              />
            </label>

            <label className="auth-field">
              <span>{t("auth.confirmPassword")}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={PASSWORD_MIN_LEN}
                placeholder={t("auth.passwordPlaceholder")}
              />
            </label>

            {err && (
              <p className="auth-error" role="alert">
                {err}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
            </button>

            <p className="auth-switch">
              <button type="button" className="auth-link" onClick={onDone}>
                {t("auth.backToApp")}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
