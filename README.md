# 台股盤中起漲篩選 — 前端

即時顯示台股盤中「起漲」篩選結果（通過 6 項硬條件、依強度分排序）。
技術棧：**React + TypeScript + Vite**，純 CSS。透過輪詢取後端 `GET /api/screen`。

> ⚠️ 篩選結果為機率性資訊參考，**非投資建議**。

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

## Docker

多階段建置（Node 打包 → nginx 提供靜態檔）。API 位址支援**執行期注入**，同一個 image
可指向任何後端，無需重新 build。

### docker compose（建議）

```bash
# 預設連 http://localhost:8000，對外開 5173
docker compose up -d --build

# 指定後端位址
VITE_API_BASE_URL=http://192.168.1.10:8000 docker compose up -d --build
```

開啟 http://localhost:5173 。

### 純 docker

```bash
docker build -t stock-quant-frontend .
docker run -d -p 5173:80 \
  -e VITE_API_BASE_URL=http://192.168.1.10:8000 \
  --name stock-quant-frontend stock-quant-frontend
```

### 運作方式

- 容器啟動時 `docker-entrypoint.sh` 依環境變數 `VITE_API_BASE_URL` 產生
  `/config.js`，前端在 runtime 讀取（優先於建置期 `import.meta.env`）。
- 改後端位址只需改環境變數重啟容器，不必重 build。
- nginx 設定 SPA fallback；`config.js` / `index.html` 不快取，`/assets/*` 長快取。

> CORS：後端需把前端來源加入 `--api-origins`（例如 `http://localhost:5173`）。

## 環境變數

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | 後端 base URL，不寫死在程式碼 |

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
