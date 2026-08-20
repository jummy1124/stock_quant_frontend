// src/components/auth/UnverifiedBanner.tsx
// 已登入但信箱未驗證時的提醒橫幅。
//
// 刻意做成「提醒」而不是「攔截」：驗證在這個專案是寬鬆制，未驗證的使用者
// 一切功能照用。寄信一旦出問題（進垃圾桶、SMTP 掛掉），使用者只是看到橫幅，
// 不會被鎖在門外。
//
// 可關閉，且關閉狀態存在 sessionStorage 而非 localStorage —— 提醒該在下次
// 開啟時回來，但不該在同一次瀏覽中一直跳出來煩人。
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../ui/Toast";
import { useT } from "../../i18n";

const DISMISS_KEY = "verify_banner_dismissed_v1";

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function UnverifiedBanner() {
  const { status, user, resendVerification } = useAuth();
  const toast = useToast();
  const t = useT();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [pending, setPending] = useState(false);

  if (status !== "authenticated" || !user || user.emailVerified || dismissed) {
    return null;
  }

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // sessionStorage 不可用（隱私模式）時，至少這次 render 已收起來
    }
  }

  async function resend() {
    if (pending) return;
    setPending(true);
    try {
      await resendVerification();
      toast.info(t("auth.verifyResent"));
    } catch (e) {
      toast.error((e as Error).message || t("auth.verifyResendFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="verify-banner" role="status">
      <span className="verify-banner__text">
        {t("auth.unverifiedBanner", { email: user.email })}
      </span>
      <span className="verify-banner__actions">
        <button
          type="button"
          className="verify-banner__action"
          onClick={() => void resend()}
          disabled={pending}
        >
          {pending ? t("auth.verifyResending") : t("auth.verifyResend")}
        </button>
        <button
          type="button"
          className="verify-banner__dismiss"
          onClick={dismiss}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          ×
        </button>
      </span>
    </div>
  );
}
