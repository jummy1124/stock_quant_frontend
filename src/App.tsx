// src/App.tsx
import { useState } from "react";
import { RecordsProvider, useRecords } from "./records/RecordsContext";
import { ScreenPage } from "./components/ScreenPage";
import { RecordsPage } from "./components/RecordsPage";

type Tab = "screen" | "records";

function Shell() {
  const [tab, setTab] = useState<Tab>("screen");
  const { count } = useRecords();

  return (
    <div className="app-shell">
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
          {count > 0 && <span className="tab__badge">{count}</span>}
        </button>
      </nav>

      {tab === "screen" ? (
        <ScreenPage />
      ) : (
        <div className="screen-page">
          <header className="app-header">
            <div className="app-header__title">
              <h1>我的紀錄</h1>
              <p className="app-header__subtitle">已關注 / 已設定目標價的個股（排版示意，未持久化）</p>
            </div>
          </header>
          <main className="screen-page__body">
            <RecordsPage />
          </main>
          <footer className="app-footer">
            ＊ 此頁為排版草稿，資料未儲存；正式版會接「多人帳號 + 後端資料庫」。
          </footer>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <RecordsProvider>
      <Shell />
    </RecordsProvider>
  );
}
