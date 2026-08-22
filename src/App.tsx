// src/App.tsx
import { useCallback, useEffect, useState } from "react";
import { RecordsProvider, useRecords } from "./records/RecordsContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { I18nProvider, useI18n } from "./i18n";
import { UserMenu } from "./components/auth/UserMenu";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AuthPanel } from "./components/auth/AuthPanel";
import { UnverifiedBanner } from "./components/auth/UnverifiedBanner";
import { ResetPasswordPage } from "./components/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./components/auth/VerifyEmailPage";
import { ScreenPage } from "./components/ScreenPage";
import { RecordsPage } from "./components/RecordsPage";
import { BacktestPage } from "./components/BacktestPage";

type Tab = "screen" | "backtest" | "records";

// ---------------------------------------------------------------------------
// 信件連結（?verify= / ?reset=）
//
// 這個專案刻意不裝 router：只有兩個由信件帶進來的入口，用 query string 判斷就夠，
// 不必為此多一個相依。nginx 已有 SPA fallback（try_files ... /index.html），
// 所以 /?verify=xxx 會正常回到這支 App。
// ---------------------------------------------------------------------------

type EmailLink = { kind: "verify" | "reset"; token: string } | null;

function readEmailLink(): EmailLink {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const verify = params.get("verify");
  if (verify) return { kind: "verify", token: verify };
  const reset = params.get("reset");
  if (reset) return { kind: "reset", token: reset };
  return null;
}

/**
 * 把 token 從網址列拿掉。
 *
 * token 是一次性憑證，留在網址列會被寫進瀏覽器歷史與書籤，也可能隨著之後的
 * 外連出現在 Referer 標頭裡。replaceState 不會多一筆歷史紀錄，使用者按上一頁
 * 也不會回到帶 token 的網址。
 */
function stripEmailLinkFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("verify");
  url.searchParams.delete("reset");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function RecordsTab() {
  const { status } = useAuth();
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <div className="records-empty">
        <p className="records-empty__main">{t("common.loading")}</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <AuthPanel />;
  }

  return <RecordsPage />;
}

function Shell() {
  const [tab, setTab] = useState<Tab>("screen");
  const { count } = useRecords();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    document.title = t("app.docTitle");
  }, [t]);

  return (
    <div className="app-shell">
      <UnverifiedBanner />
      <div className="app-topbar">
        <nav className="tabs" role="tablist">
          <button
            className={`tab ${tab === "screen" ? "tab--active" : ""}`}
            onClick={() => setTab("screen")}
            role="tab"
            aria-selected={tab === "screen"}
          >
            {t("tab.screen")}
          </button>
          <button
            className={`tab ${tab === "backtest" ? "tab--active" : ""}`}
            onClick={() => setTab("backtest")}
            role="tab"
            aria-selected={tab === "backtest"}
          >
            {t("tab.backtest")}
          </button>
          <button
            className={`tab ${tab === "records" ? "tab--active" : ""}`}
            onClick={() => setTab("records")}
            role="tab"
            aria-selected={tab === "records"}
          >
            {t("tab.records")}
            {isAuthenticated && count > 0 && <span className="tab__badge">{count}</span>}
          </button>
        </nav>
        <div className="app-topbar__right">
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>

      {tab === "screen" ? (
        <ScreenPage />
      ) : tab === "backtest" ? (
        <BacktestPage />
      ) : (
        <div className="screen-page">
          <header className="app-header">
            <div className="app-header__title">
              <h1>{t("records.title")}</h1>
              <p className="app-header__subtitle">{t("records.subtitle")}</p>
            </div>
          </header>
          <main className="screen-page__body">
            <RecordsTab />
          </main>
          <footer className="app-footer">
            {t("records.footerPre")}
            <code>/userapi/records</code>
            {t("records.footerPost")}
          </footer>
        </div>
      )}
    </div>
  );
}

/**
 * 有信件 token 就顯示對應的整頁畫面，否則顯示一般畫面。
 *
 * 必須放在 AuthProvider 內側：驗證頁要 markVerified()，重設密碼頁完成後要
 * applyAuthResult() 直接登入。
 */
function Router() {
  const [link, setLink] = useState<EmailLink>(readEmailLink);

  const done = useCallback(() => {
    stripEmailLinkFromUrl();
    setLink(null);
  }, []);

  if (link?.kind === "verify") {
    return <VerifyEmailPage token={link.token} onDone={done} />;
  }
  if (link?.kind === "reset") {
    return <ResetPasswordPage token={link.token} onDone={done} />;
  }
  return <Shell />;
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <RecordsProvider>
            <Router />
          </RecordsProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
