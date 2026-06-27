// src/App.tsx
import { useEffect, useState } from "react";
import { RecordsProvider, useRecords } from "./records/RecordsContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { I18nProvider, useI18n } from "./i18n";
import { UserMenu } from "./components/auth/UserMenu";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AuthPanel } from "./components/auth/AuthPanel";
import { ScreenPage } from "./components/ScreenPage";
import { RecordsPage } from "./components/RecordsPage";

type Tab = "screen" | "records";

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

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <RecordsProvider>
            <Shell />
          </RecordsProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
