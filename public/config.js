// 執行期設定 (runtime config)。
// 開發環境留空 → 走 import.meta.env.VITE_API_BASE_URL / 預設值。
// Docker 容器啟動時，docker-entrypoint.sh 會用環境變數覆寫此檔。
window.__APP_CONFIG__ = {
  // API_BASE_URL: "http://localhost:8000",
};
