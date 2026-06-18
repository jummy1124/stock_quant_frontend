#!/usr/bin/env bash
# 在 GCP VM 上執行：拉 image → docker compose 重啟 → 健康檢查 → 失敗回滾。
# 認證用 VM「附掛服務帳戶」的 metadata token，VM 上不需裝 gcloud。
# 必要環境變數 (由 deploy.yml 帶入): IMAGE, REGION_HOST
set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="docker-compose.deploy.yml"
SERVICE="stock-quant-frontend"                         # 與 compose 的 container_name 一致
HEALTH_URL="${HEALTH_URL:-http://localhost:5173/health}"   # 對外埠 5173 → nginx 自身 /health
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"                 # 30×3s=90s；純前端秒開，足夠
HEALTH_INTERVAL="${HEALTH_INTERVAL:-3}"
METADATA_TOKEN_URL="http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

cd "${APP_DIR}"
: "${IMAGE:?需要 IMAGE}"; : "${REGION_HOST:?需要 REGION_HOST}"
log() { echo "[$(date '+%F %T')] $*"; }

# 這台 VM 的 docker 是否需要 sudo (OS Login 服務帳戶通常需要)
if docker info >/dev/null 2>&1; then SUDO=""; else SUDO="sudo"; fi
# compose 指令本體 (不含 sudo；啟動時用 sudo env 帶變數，見 bring_up)
if ${SUDO} docker compose version >/dev/null 2>&1; then DC_BIN="docker compose"; else DC_BIN="docker-compose"; fi

PREV_IMAGE="$(${SUDO} docker inspect --format '{{.Config.Image}}' "${SERVICE}" 2>/dev/null || true)"
log "目前線上版本: ${PREV_IMAGE:-<無>}"; log "目標版本: ${IMAGE}"

# 用 VM 附掛服務帳戶的 access token 登入 Artifact Registry
log "登入 ${REGION_HOST}..."
TOKEN="$(curl -s -H 'Metadata-Flavor: Google' "${METADATA_TOKEN_URL}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')"
echo "${TOKEN}" | ${SUDO} docker login -u oauth2accesstoken --password-stdin "https://${REGION_HOST}"

log "拉取 image..."; ${SUDO} docker pull "${IMAGE}"

health_check() {
  log "健康檢查 ${HEALTH_URL} (最多 $((HEALTH_RETRIES*HEALTH_INTERVAL))s)..."
  for i in $(seq 1 "${HEALTH_RETRIES}"); do
    if curl -fsS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then log "健康檢查通過 (第 ${i} 次)"; return 0; fi
    sleep "${HEALTH_INTERVAL}"
  done
  return 1
}

bring_up() {
  # 重點1：用 sudo env 帶入 IMAGE，否則 sudo 會清掉前置環境變數，compose 取不到 ${IMAGE}
  # 重點2：若有非 compose 管理的同名容器殘留導致 name conflict，移除後重試
  if ! ${SUDO} env IMAGE="$1" ${DC_BIN} -f "${COMPOSE_FILE}" up -d --remove-orphans; then
    log "compose up 失敗，移除殘留同名容器後重試..."
    ${SUDO} docker rm -f "${SERVICE}" 2>/dev/null || true
    ${SUDO} env IMAGE="$1" ${DC_BIN} -f "${COMPOSE_FILE}" up -d --remove-orphans
  fi
}

log "啟動新版本..."; bring_up "${IMAGE}"

if health_check; then
  log "✅ 部署成功: ${IMAGE}"; ${SUDO} docker image prune -f >/dev/null 2>&1 || true; exit 0
fi

log "❌ 健康檢查失敗，回滾..."; ${SUDO} docker logs --tail 50 "${SERVICE}" 2>&1 || true
if [ -n "${PREV_IMAGE}" ]; then
  bring_up "${PREV_IMAGE}"
  health_check && log "↩️ 已回滾 (${PREV_IMAGE})" || log "⚠️ 回滾後仍失敗，需人工介入"
else
  log "⚠️ 無上一版本可回滾 (首次部署)；保留容器以利除錯"
fi
exit 1
