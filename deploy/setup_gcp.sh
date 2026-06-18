#!/usr/bin/env bash
# 一次性 GCP 建置：API / Artifact Registry / WIF / SA / IAM / 防火牆。
# 在 Cloud Shell 跑：先用環境變數覆蓋變數區 → bash deploy/setup_gcp.sh → 把輸出貼到 GitHub Variables。
# ⚠️ 不要把真實 PROJECT_ID / VM / SA 寫死 commit 進 repo；用環境變數覆蓋執行（見 playbook §8-#3）。
set -euo pipefail

# ---- 變數區 (用環境變數覆蓋；repo 內只留 placeholder) ----
PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
REGION="${REGION:-us-west1}"                 # 要與 VM、AR 同區
AR_REPOSITORY="${AR_REPOSITORY:-stock-quant-frontend}"
IMAGE_NAME="${IMAGE_NAME:-stock-quant-frontend}"
GITHUB_OWNER="${GITHUB_OWNER:-your-github-account}"
GITHUB_REPO="${GITHUB_REPO:-stock_quant_frontend}"
VM_NAME="${VM_NAME:-your-vm-name}"
VM_ZONE="${VM_ZONE:-us-west1-b}"
DEPLOY_SA_NAME="${DEPLOY_SA_NAME:-gha-deployer}"
POOL_ID="${POOL_ID:-github-pool}"
PROVIDER_ID="${PROVIDER_ID:-github-provider}"
VM_APP_DIR="${VM_APP_DIR:-/opt/stock-quant-frontend}"
# ------------------------------------------------

DEPLOY_SA_EMAIL="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud config set project "${PROJECT_ID}"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"

echo "==> 1. 啟用 API"
gcloud services enable artifactregistry.googleapis.com iamcredentials.googleapis.com \
  iam.googleapis.com sts.googleapis.com compute.googleapis.com iap.googleapis.com

echo "==> 2. Artifact Registry"
gcloud artifacts repositories create "${AR_REPOSITORY}" --repository-format=docker \
  --location="${REGION}" 2>/dev/null || echo "   (已存在)"

echo "==> 3. 部署 SA"
gcloud iam service-accounts create "${DEPLOY_SA_NAME}" --display-name="GitHub Actions deployer" 2>/dev/null || echo "   (已存在)"

echo "==> 4. 授權部署 SA"
gcloud artifacts repositories add-iam-policy-binding "${AR_REPOSITORY}" --location="${REGION}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" --role="roles/artifactregistry.writer" >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" --role="roles/iap.tunnelResourceAccessor" --condition=None >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" --role="roles/compute.osAdminLogin" --condition=None >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" --role="roles/compute.viewer" --condition=None >/dev/null

echo "==> 5. WIF"
gcloud iam workload-identity-pools create "${POOL_ID}" --location="global" 2>/dev/null || echo "   (已存在)"
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" --location="global" \
  --workload-identity-pool="${POOL_ID}" --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='${GITHUB_OWNER}'" 2>/dev/null || echo "   (已存在)"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_OWNER}/${GITHUB_REPO}" >/dev/null

echo "==> 6. VM：OS Login + 附掛 SA 可讀 AR + 部署 SA 可 actAs"
gcloud compute instances add-metadata "${VM_NAME}" --zone="${VM_ZONE}" --metadata=enable-oslogin=TRUE 2>/dev/null || echo "   (確認 VM 存在)"
VM_SA="$(gcloud compute instances describe "${VM_NAME}" --zone="${VM_ZONE}" --format='value(serviceAccounts[0].email)' 2>/dev/null || true)"
if [ -n "${VM_SA}" ]; then
  gcloud artifacts repositories add-iam-policy-binding "${AR_REPOSITORY}" --location="${REGION}" \
    --member="serviceAccount:${VM_SA}" --role="roles/artifactregistry.reader" >/dev/null
  # ★ 關鍵修正：部署 SA 要能「以 VM 的服務帳戶身分」連入，否則 scp/ssh 會 PERMISSION_DENIED (playbook §8-#6)
  gcloud iam service-accounts add-iam-policy-binding "${VM_SA}" \
    --member="serviceAccount:${DEPLOY_SA_EMAIL}" --role="roles/iam.serviceAccountUser" >/dev/null
  echo "   VM SA = ${VM_SA} 已授 AR Reader + 部署 SA actAs"
else
  echo "   ⚠️ 找不到 VM 附掛 SA，請手動授 AR Reader 與對部署 SA 的 serviceAccountUser"
fi

echo "==> 7. IAP 防火牆 (允許 IAP 來源連 SSH；缺這條 deploy 會 SSH timeout, playbook §8-#10)"
gcloud compute firewall-rules create allow-iap-ssh --direction=INGRESS --action=ALLOW \
  --rules=tcp:22 --source-ranges=35.235.240.0/20 2>/dev/null || echo "   (已存在)"

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
cat <<EOF

============================================================
✅ 完成。到 GitHub repo > Settings > Secrets and variables > Actions > Variables 新增：

  GCP_PROJECT_ID   = ${PROJECT_ID}
  GCP_REGION       = ${REGION}
  AR_REPOSITORY    = ${AR_REPOSITORY}
  IMAGE_NAME       = ${IMAGE_NAME}
  GCP_WIF_PROVIDER = ${WIF_PROVIDER}
  GCP_DEPLOY_SA    = ${DEPLOY_SA_EMAIL}
  GCE_VM_NAME      = ${VM_NAME}
  GCE_VM_ZONE      = ${VM_ZONE}
  VM_APP_DIR       = ${VM_APP_DIR}
============================================================
EOF
