import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Multi-page build: the main screening SPA (index.html) and the standalone
  // download page (download.html) are independent entries. The download page
  // only depends on src/download/* + the /downloadapi backend contract, so it
  // can later be split into its own project with no changes to the main app.
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        download: resolve(__dirname, "download.html"),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    // 開發時把 /api、/health 代理到篩選後端，與正式環境同樣走「同源」相對路徑、免 CORS。
    // 篩選後端位址可用環境變數 BACKEND_URL 覆寫，預設 http://localhost:8000。
    //
    // /userapi 代理到「使用者資料」後端（stock_quant_userdata，FastAPI）。
    // 預設 http://localhost:8100，可用 USERDATA_URL 覆寫。dev 直連真後端時，
    // 請確保 .env 的 VITE_ENABLE_MSW 不為 true（否則 MSW 會先攔截 /userapi）。
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.BACKEND_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/userapi": {
        target: process.env.USERDATA_URL ?? "http://localhost:8100",
        changeOrigin: true,
      },
      // 下載頁 API（篩選快照 / 我的紀錄 .xlsx），與 /userapi 同一個 userdata 後端。
      "/downloadapi": {
        target: process.env.USERDATA_URL ?? "http://localhost:8100",
        changeOrigin: true,
      },
    },
  },
});
