# 使用者資料服務 API 契約（/userapi）

多人版「個股紀錄」的前後端契約。前端已照此實作（`src/api/userClient.ts`、
`src/records/RecordsRepo.ts`），dev 期間由 MSW 模擬（`src/mocks/`），**尚無真後端**。
未來的後端服務（FastAPI + PostgreSQL）只要實作下列端點即可無痛接上。

## 認證（之後實作）

| Method | Path | 說明 |
| --- | --- | --- |
| POST | `/userapi/auth/register` | 註冊，回 `{ token, user }` |
| POST | `/userapi/auth/login` | 登入，回 `{ token, user }` |
| POST | `/userapi/auth/logout` | 登出 |
| GET | `/userapi/me` | 取目前使用者 |

前端在登入後呼叫 `setAuthToken(token)`，之後每個請求自動帶
`Authorization: Bearer <token>`；收到 `401` 會清 token（之後導向登入）。

## 個股紀錄（前端已串）

所有端點需登入；資料以「使用者」隔離（後端用 `user_id` + RLS）。

| Method | Path | 說明 |
| --- | --- | --- |
| GET | `/userapi/records` | 取目前使用者全部紀錄，回 `{ records: Record[] }` |
| PUT | `/userapi/records/{market_code}/{symbol}` | 新增 / 覆寫一筆，回該 `Record` |
| DELETE | `/userapi/records/{market_code}/{symbol}` | 刪除一筆，回 `204` |

### `Record` 形狀（後端 snake_case；前端 `RecordsRepo` 會轉成 camelCase）

```jsonc
{
  "symbol": "2330",
  "name": "台積電",
  "market": "上市",
  "market_code": "TWSE",
  "target_price": 120.0,    // 可為 null
  "cost_price": 95.5,       // 可為 null
  "last_close": 109.5,      // 紀錄當下現價，可為 null
  "updated_at": "2026-06-21T14:08:00Z"
}
```

### PUT 請求 body

```jsonc
{ "name": "台積電", "market": "上市",
  "target_price": 120.0, "cost_price": 95.5, "last_close": 109.5 }
```

> 對應 PostgreSQL：`records(user_id, market_code, symbol, name, market,
> target_price, cost_price, last_close, updated_at)`，主鍵 `(user_id, market_code, symbol)`。

## 前端如何在無後端下開發（MSW）

```bash
npm install            # 會帶入 msw (devDependency)
npx msw init public/ --save   # 產生 public/mockServiceWorker.js（只需做一次）
npm run dev            # dev 自動啟動 MSW，攔截 /userapi/*；localStorage 暫存
```

接上真後端時：把 `src/main.tsx` 的 `enableMocking()` 拿掉（或正式 build 本就不載入 MSW），
並在 `nginx.conf` 加一個 `location /userapi/ { proxy_pass http://<userdata 服務>; }`。
前端程式碼（`fetch /userapi/...`）完全不用改。
