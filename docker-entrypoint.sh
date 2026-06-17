#!/bin/sh
# 在 nginx 啟動前，依環境變數產生 /config.js，覆寫前端的執行期 API 位址。
# 由 nginx 官方 image 的 entrypoint 自動執行 (放在 /docker-entrypoint.d/)。
set -eu

CONFIG_FILE="/usr/share/nginx/html/config.js"
API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8000}"

cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}"
};
EOF

echo "[app-config] API_BASE_URL=${API_BASE_URL} -> ${CONFIG_FILE}"
