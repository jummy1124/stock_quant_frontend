# 台股盤中起漲篩選 — 前端

即時顯示台股盤中「起漲」篩選結果（通過 6 項硬條件）。
技術棧：**React + TypeScript + Vite**，純 CSS。透過輪詢取後端 `GET /api/screen`。

頁面上的「**篩選條件**」面板可即時調整漲幅池與起漲點參數（漲幅下限、是否排除已鎖漲停、
量增倍數、短/月均線天數、月線上彎回看天數、量能是否用全日預估）。參數隨請求帶給後端即時
重算，**預設值＝原專案設定**；設定會存在瀏覽器 `localStorage`，下次開啟自動沿用，並可一鍵
「恢復預設」（預設值以後端 `GET /api/screen-defaults` 為準）。

**點選任一檔個股**會彈出該檔近 6 個月歷史走勢圖（K 棒 + 成交量 + MA5/20/60），
資料來自後端 `GET /api/history/{symbol}`，K 線以 [lightweight-charts](https://github.com/tradingview/lightweight-charts) 繪製。

> ⚠️ 篩選結果與歷史資訊均為機率性資訊參考，**非投資建議**。

## 後端 API

本前端搭配的後端（FastAPI，每分鐘刷新一份最新快照）位於另一個 repo：
**https://github.com/jummy1124/stock_quant** —— 端點規格、篩選邏輯與啟動方式請參考該專案。

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
| `BACKEND_URL` | `http://localhost:8000` | 僅開發用：vite dev server 的 `/api` 代理目標（篩選後端） |
| `USERDATA_URL` | `http://localhost:8100` | 僅開發用：vite dev server 的 `/userapi` 代理目標（帳號 + 個股紀錄後端） |
| `VITE_ENABLE_MSW` | 未設（不啟用） | 設 `true` 時於 dev 用 MSW 模擬 `/userapi`（假 auth + records）；不設則直連真後端 |

## 帳號 / 個股紀錄（/userapi）

「我的紀錄」分頁需登入。前端的帳號與紀錄走 `/userapi/*`，契約見
[`USERDATA_API.md`](./USERDATA_API.md)，由獨立後端 `stock_quant_userdata`（FastAPI + PostgreSQL）提供。

兩種開發模式：

- **直連真後端（預設）**：先把 `stock_quant_userdata` 跑在 `localhost:8100`
  （`docker compose up` 或 `poetry run uvicorn app.main:app --port 8100`），再 `npm run dev`。
  vite 會把 `/userapi` 代理過去，同源免 CORS。註冊 → 登入 → 紀錄會真的存進後端 DB。
- **MSW 模擬（無後端）**：在 `.env` 設 `VITE_ENABLE_MSW=true`，首次需
  `npx msw init public/ --save` 產生 worker。此模式下 auth 與 records 全在瀏覽器以
  localStorage 模擬，並以假 token 做使用者隔離。

正式環境一律不載入 MSW，請求由 nginx `location /userapi/` 反代到 userdata 服務（見 `nginx.conf`）。
登入 token 存於 `localStorage`，重整後維持登入；任何請求收到 `401` 會自動登出並導回登入。

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
  types/screen.ts        # 後端契約型別 (Meta / StockRow / BreakoutRow / ScreenSettings / DEFAULT_SETTINGS)
  api/screen.ts          # fetchScreen / fetchPool / fetchScreenDefaults；帶篩選參數；503 → NotReadyError
  hooks/useScreen.ts     # 30s 輪詢、帶 settings（變更即重查）、AbortController 清理、保留前份資料
  utils/format.ts        # 數字/百分比/相對時間格式化 + 紅漲綠跌 class
  api/userClient.ts      # /userapi 共用 client：JWT 注入、401 處理、逾時、錯誤擷取
  api/authApi.ts         # login / register / me / logout（snake_case ↔ camelCase）
  auth/
    types.ts             # User / AuthState
    AuthContext.tsx      # AuthProvider + useAuth；token 還原、401 自動登出
  records/
    types.ts             # StockRecord / RecordDraft
    RecordsRepo.ts       # InMemory / Http 資料來源抽象
    RecordsContext.tsx   # 依登入狀態載入；upsert/remove 樂觀更新 + 回滾
  mocks/                 # MSW（假 auth + records，VITE_ENABLE_MSW=true 才載入）
  components/
    ScreenPage.tsx       # 主頁面組裝
    Header.tsx           # 標題 + 免責聲明
    StatusBar.tsx        # 資料源徽章 / 新鮮度 / 統計 / warning / error
    Controls.tsx         # top 下拉 + 可展開「篩選條件」面板（漲幅池/起漲參數 + 恢復預設）
    StockTable.tsx       # 主清單 (可點欄位排序)
    Reasons.tsx          # reasons → tag
    States.tsx           # 載入中 / 資料準備中(503) / 空清單
    RecordsPage.tsx      # 「我的紀錄」清單（骨架載入 / 錯誤重試）
    StockRecordPanel.tsx # 彈窗內目標價/成本價 + 試算 + 儲存
    auth/                # LoginForm / RegisterForm / AuthPanel / UserMenu
    ui/Toast.tsx         # 全域 toast（useToast）
  App.tsx                # Toast → Auth → Records Provider 組合 + 分頁
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
- 清單為通過 6 項硬條件的起漲個股，僅供資訊參考，非投資建議（UI 已加註明）。
