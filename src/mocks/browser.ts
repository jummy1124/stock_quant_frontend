// src/mocks/browser.ts
// 啟動瀏覽器端 MSW worker（僅 dev 使用；見 src/main.tsx）。
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
