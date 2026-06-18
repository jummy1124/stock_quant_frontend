# 台股盤中起漲篩選 — 前端

即時顯示台股盤中「起漲」篩選結果（通過 6 項硬條件、依強度分排序）。
技術棧：**React + TypeScript + Vite**，純 CSS。透過輪詢取後端 `GET /api/screen`。

> ⚠️ 篩選結果為機率性資訊參考，**非投資建議**。

## CI/CD

push 到 main 由 GitHub Actions 自動測試 + 建 Docker image 推 Artifact Registry；
每日固定時段（08:40 Asia/Taipei）排程比對有無新版，有才經 IAP SSH 部署到 GCP VM，
含健康檢查與失敗自動回滾。驗證採 Workload Identity Federation（無金鑰）。

- workflows：`.github/workflows/ci.yml`、`deploy.yml`
- 部署資產：`deploy/docker-compose.deploy.yml`、`deploy_on_vm.sh`、`setup_gcp.sh`
- 首次設定與排錯見 `CICD_PLAYBOOK_GCP_VM.md`

## 快速開始

```bash
npm install
cp .env.example .env   # 視需要調整 VITE_API_BASE_URL
npm run dev            # http://localhost:5173
```

後端（另一個 repo）需先啟動並允許本前端跨域：

```bash
python run_intraday.py --serve --api-origins http://localhost:5173
```

## Docker（同源 / 反向代理架構）

多階段建置（Node 打包 → nginx 提供靜態檔）。前端用**同源相對路徑** `/api`，由
nginx 反向代理到後端，因此**不寫死後端 IP、也不需要設 CORS**。後端外部 IP 變動時，
前端不必重 build、不必改設定。

```bash
docker compose up -d --build
```

開啟 http://localhost:5173（或部署主機的 `:5173`）。

### 運作方式

- nginx 把 `/api/`、`/health` 反向代理到後端（預設 `host.docker.internal:8000`，
  即「跑在 host 上、publish 8000 埠」的後端），其餘走 SPA fallback。
- 前端 API base 預設為空字串 = 同源，所以瀏覽器打的是
  `http://<前端主機>/api/screen`，由 nginx 轉給後端 → 無跨域、無 CORS。
- 容器透過 `extra_hosts: host.docker.internal:host-gateway` 連回 host。
- `config.js` / `index.html` 不快取，`/assets/*` 長快取。

### 後端需求

- 後端在 host 上 publish `8000` 埠即可（你現有的 docker compose 不用改）。
- 不再需要 `--api-origins`（同源、無 CORS）。
- 對外防火牆只需開前端埠（`5173` 或 `80`）；`8000` 可不對外（由 nginx 內部代理）。

### 直連模式（選用）

若要讓瀏覽器**直接**連另一台後端（不經代理），設 `VITE_API_BASE_URL` 為完整 URL
（此時後端需自行開 CORS）：

```bash
VITE_API_BASE_URL=http://other-host:8000 docker compose up -d --build
```

## 環境變數

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 空（同源） | 留空走 nginx `/api` 代理；填完整 URL 則瀏覽器直連該後端（需 CORS） |
| `BACKEND_URL` | `http://localhost:8000` | 僅開發用：vite dev server 的 `/api` 代理目標 |

## 指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發伺服器 |
| `npm run build` | 型別檢查 + 打包到 `dist/` |
| `npm run preview` | 預覽打包結果 |
| `npm run type-check` | 只跑 `tsc --noEmit` |

## 專案結構

```
src/
  types/screen.ts        # 後端契約型別 (Meta / StockRow / BreakoutRow / ...)
  api/screen.ts          # fetchScreen / fetchPool；503 → NotReadyError
  hooks/useScreen.ts     # 30s 輪詢、AbortController 清理、保留前份資料
  utils/format.ts        # 數字/百分比/相對時間格式化 + 紅漲綠跌 class
  components/
    ScreenPage.tsx       # 主頁面組裝
    Header.tsx           # 標題 + 免責聲明
    StatusBar.tsx        # 資料源徽章 / 新鮮度 / 統計 / warning / error
    Controls.tsx         # top 下拉 + min_score 滑桿
    StockTable.tsx       # 主清單 (可點欄位排序)
    Reasons.tsx          # reasons → tag
    States.tsx           # 載入中 / 資料準備中(503) / 空清單
  App.tsx
  main.tsx
```

## 狀態處理重點

- **`503`** 視為「資料準備中」（非錯誤），保留前份資料並持續輪詢。
- `results` 為空陣列 → 顯示「目前沒有符合的起漲個股」空狀態。
- `meta.warning`（報價限流）/ `meta.last_error`（後端錯誤）以警示色顯示，仍渲染既有資料。
- fetch 失敗 → 顯示連線提示，下次輪詢自動恢復。

## 顯示慣例

- **紅漲綠跌**（台股慣例，與歐美相反）。
- `age_seconds` 轉「N 秒/分鐘前更新」；> 180 秒標記「資料可能延遲」。
- `source`：`live` →「盤中即時」綠燈、`eod` →「最後交易日收盤」灰燈。
- 量以 `lots`（張）顯示；`null` 一律顯示 `—`。
- `score` 僅供排序，非投資評級（UI 已加註明）。
