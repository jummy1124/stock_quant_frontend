// 執行期設定 (runtime config)。
// 同源(反向代理)架構下留空字串即可 → 前端走相對路徑 /api。
// Docker 容器啟動時，docker-entrypoint.sh 會依環境變數覆寫此檔。
window.__APP_CONFIG__ = {
  API_BASE_URL: "",
};
