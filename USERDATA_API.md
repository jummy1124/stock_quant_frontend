# 使用者資料服務 API 契約（/userapi）

多人版「個股紀錄」的前後端契約。前端已照此實作（`src/api/userClient.ts`、
`src/api/authApi.ts`、`src/records/RecordsRepo.ts`），dev 期間可由 MSW 模擬
（`src/mocks/`，含信件 token 流程——連結會 `console.info` 出來讓你複製）。
真後端為 `stock_quant_backend`（FastAPI + PostgreSQL）。

## 認證

| Method | Path | 需登入 | 說明 |
| --- | --- | --- | --- |
| POST | `/userapi/auth/register` | — | 註冊，回 `{ token, user }`；同時寄出驗證信 |
| POST | `/userapi/auth/login` | — | 登入，回 `{ token, user }` |
| POST | `/userapi/auth/logout` | — | 登出（後端 no-op，前端丟掉 token） |
| GET | `/userapi/me` | ✓ | 取目前使用者 |
| POST | `/userapi/auth/verify-email` | — | body `{ token }`，回 `user` |
| POST | `/userapi/auth/resend-verification` | ✓ | 重寄驗證信給自己，回 `202 { message }` |
| POST | `/userapi/auth/forgot-password` | — | body `{ email }`，回 `202 { message }` |
| POST | `/userapi/auth/reset-password` | — | body `{ token, password }`，回 `{ token, user }` |

前端在登入後呼叫 `setAuthToken(token)`，之後每個請求自動帶
`Authorization: Bearer <token>`；收到 `401` 會清 token（之後導向登入）。

### `user` 形狀

```jsonc
{ "id": "…", "email": "you@example.com",
  "display_name": "阿明",      // 可為 null
  "email_verified": false }    // 未驗證仍可正常使用，只顯示提醒橫幅
```

### 信件連結怎麼回到前端

後端把連結組成 `{APP_BASE_URL}/?verify=<token>` 與 `{APP_BASE_URL}/?reset=<token>`。
`src/App.tsx` 在啟動時讀 query string 決定要顯示驗證頁 / 重設頁 / 一般畫面，
處理完用 `history.replaceState` 把 token 從網址列拿掉（避免留在瀏覽器歷史與
之後外連的 Referer 裡）。**因此不需要 router，但 nginx 必須保留 SPA fallback**
（`try_files $uri $uri/ /index.html;`，現有設定已有）。

### 幾個前端必須照做的行為

- **`forgot-password` 一律回 `202` 且內容相同**，不論該信箱有沒有註冊。前端不可以
  加任何「查無此帳號」的分支——否則等於把後端刻意堵掉的帳號列舉管道重新開一個。
- **連結失效一律是 `400`**，不細分「過期 / 用過 / 不存在」，同理。
- **`429`** 代表命中速率限制（登入、註冊、寄信端點），帶 `Retry-After`。
- **密碼長度 8–72**，與後端 `PASSWORD_MIN_LEN` / `PASSWORD_MAX_LEN` 對齊，
  前端常數放在 `src/components/auth/passwordPolicy.ts`。

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
