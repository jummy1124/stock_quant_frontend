import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
});
