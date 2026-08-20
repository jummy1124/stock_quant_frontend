// src/components/auth/VerifyEmailPage.tsx
// 使用者從信件點進 /?verify=<token> 時顯示的整頁畫面。
//
// 不需要登入即可驗證：連結常在另一個瀏覽器或手機上點開，「持有 token」本身
// 就是所有權證明。若剛好在已登入的分頁點開，順手 markVerified() 收掉橫幅。
//
// React 18 的 StrictMode 在開發模式會把 effect 跑兩次；驗證 token 是一次性的，
// 第二次呼叫必然失敗並蓋掉成功畫面 —— 用 ref 擋掉重複送出。
import { useEffect, useRef, useState } from "react";
import * as authApi from "../../api/authApi";
import { useAuth } from "../../auth/AuthContext";
import { useT } from "../../i18n";

type State = "verifying" | "ok" | "failed";

export function VerifyEmailPage({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const t = useT();
  const { markVerified } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // 見檔頭：StrictMode 會重跑 effect
    started.current = true;

    let cancelled = false;
    void (async () => {
      try {
        await authApi.verifyEmail(token);
        if (cancelled) return;
        markVerified();
        setState("ok");
      } catch (e) {
        if (cancelled) return;
        setErr((e as Error).message || t("auth.verifyFailedBody"));
        setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, markVerified, t]);

  return (
    <div className="auth-standalone">
      <div className="auth-card">
        <div className="auth-form">
          {state === "verifying" && (
            <>
              <h2 className="auth-form__title">{t("auth.verifying")}</h2>
              <p className="auth-hint">{t("common.loading")}</p>
            </>
          )}

          {state === "ok" && (
            <>
              <h2 className="auth-form__title">{t("auth.verifyOkTitle")}</h2>
              <p className="auth-notice">{t("auth.verifyOkBody")}</p>
              <button type="button" className="auth-submit" onClick={onDone}>
                {t("auth.continueToApp")}
              </button>
            </>
          )}

          {state === "failed" && (
            <>
              <h2 className="auth-form__title">{t("auth.verifyFailedTitle")}</h2>
              <p className="auth-error" role="alert">
                {err}
              </p>
              <p className="auth-hint">{t("auth.verifyFailedHint")}</p>
              <button type="button" className="auth-submit" onClick={onDone}>
                {t("auth.backToApp")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
