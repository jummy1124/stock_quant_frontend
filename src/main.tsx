// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("找不到 #root 節點");

// dev 期間啟動 MSW，攔截 /userapi（個股紀錄）等尚未有真後端的端點。
// 正式環境 (import.meta.env.DEV === false) 不會載入 mock，請求會走 nginx /userapi 反代。
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
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
