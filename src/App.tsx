// src/App.tsx
import { useState } from "react";
import { RecordsProvider, useRecords } from "./records/RecordsContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { UserMenu } from "./components/auth/UserMenu";
import { AuthPanel } from "./components/auth/AuthPanel";
import { ScreenPage } from "./components/ScreenPage";
import { RecordsPage } from "./components/RecordsPage";

type Tab = "screen" | "records";

function RecordsTab() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="records-empty">
        <p className="records-empty__main">載入中…</p>
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
            篩選結果
          </button>
          <button
            className={`tab ${tab === "records" ? "tab--active" : ""}`}
            onClick={() => setTab("records")}
            role="tab"
            aria-selected={tab === "records"}
          >
            我的紀錄
            {isAuthenticated && count > 0 && <span className="tab__badge">{count}</span>}
          </button>
        </nav>
        <UserMenu />
      </div>

      {tab === "screen" ? (
        <ScreenPage />
      ) : (
        <div className="screen-page">
          <header className="app-header">
            <div className="app-header__title">
              <h1>我的紀錄</h1>
              <p className="app-header__subtitle">已關注 / 已設定目標價的個股，登入後跨裝置同步保存</p>
            </div>
          </header>
          <main className="screen-page__body">
            <RecordsTab />
          </main>
          <footer className="app-footer">
            ＊ 紀錄經 <code>/userapi/records</code> 儲存於後端，以帳號隔離。
          </footer>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RecordsProvider>
          <Shell />
        </RecordsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
