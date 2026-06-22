// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("找不到 #root 節點");

// MSW 僅在「dev 且明確啟用」時載入，攔截 /userapi（假 auth + 個股紀錄）。
// 預設不啟用 → dev 直連真後端（vite proxy /userapi → localhost:8100）。
// 要用模擬後端開發：在 .env 設 VITE_ENABLE_MSW=true。
// 正式環境 (import.meta.env.DEV === false) 一律不載入 mock，走 nginx /userapi 反代。
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_ENABLE_MSW !== "true") return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

void enableMocking().then(() => {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
