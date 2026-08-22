// src/i18n/index.tsx
// 輕量 i18n：繁體中文 / 英文切換，無外部相依。
// - 預設繁中；使用者切換後存 localStorage，下次自動沿用。
// - t(key, vars) 取翻譯，支援 {var} 內插；缺字回退到繁中、再回退到 key 本身。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "zh-TW" | "en";
export const LOCALES: Locale[] = ["zh-TW", "en"];
const LS_KEY = "app_locale_v1";

export type Vars = Record<string, string | number>;
export type TFunc = (key: string, vars?: Vars) => string;

type Dict = Record<string, string>;

const zhTW: Dict = {
  // 通用
  "common.loading": "載入中…",
  "common.reload": "重新載入",
  "common.remove": "移除",
  "common.close": "關閉",
  "common.dash": "—",
  "common.notAdvice": "非投資建議",

  // 文件標題
  "app.docTitle": "台股盤中起漲篩選",

  // 分頁
  "tab.screen": "篩選結果",
  "tab.records": "我的紀錄",

  // Header
  "header.title": "台股盤中起漲篩選",
  "header.subtitle": "即時顯示通過 6 項硬條件的起漲個股",
  "header.downloadLink": "資料下載",
  "disclaimer.pre": "⚠️ 篩選結果為機率性資訊參考，",
  "disclaimer.post": "。",

  // ScreenPage footer
  "screen.footer":
    "⚠️ 篩選結果為機率性資訊參考，非投資建議。資料源依交易時間自動切換（盤中即時 / 收盤）。",

  // Controls
  "controls.show": "顯示筆數",
  "controls.all": "全部",
  "controls.topN": "前 {n}",
  "controls.filters": "篩選條件",
  "controls.adjusted": "已調整",
  "controls.reset": "恢復預設",
  "controls.group.pool": "漲幅池（第一層）",
  "controls.group.breakout": "起漲點 6 條件（第二層）",
  "controls.field.minChange": "漲幅下限",
  "controls.field.excludeLimitUp": "排除已鎖漲停",
  "controls.hint.excludeLimitUp": "收盤 ≤ 漲停前一檔",
  "controls.field.volRatio": "量增倍數",
  "controls.hint.volRatio": "當日量/昨量 ≥",
  "controls.field.maShort": "短均線天數",
  "controls.hint.maShort": "預設 5MA",
  "controls.field.maMid": "月均線天數",
  "controls.hint.maMid": "預設 20MA",
  "controls.field.maSlope": "月線上彎回看",
  "controls.hint.maSlope": "今日 vs N 日前",
  "controls.field.volProjection": "量能用全日預估",
  "controls.hint.volProjection": "盤中早盤較公允",
  "controls.note": "紅K、突破昨高、昨日在短均線下為固定條件，不可調整。",

  // 表格欄位（篩選 + 紀錄共用）
  "th.symbol": "代號 / 名稱",
  "th.market": "市場",
  "th.price": "現價",
  "th.change": "漲跌",
  "th.lots": "量(張)",
  "th.volRatio": "量比",
  "th.cost": "成本價",
  "th.target": "目標價",
  "th.return": "報酬率",
  "th.upside": "距目標",
  "th.time": "紀錄時間",
  "th.action": "操作",

  // StockTable
  "table.viewHistory": "查看歷史K線與紀錄",
  "table.notePre": "點任一列查看",
  "table.noteStrong": "歷史K線 + 我的紀錄",
  "table.notePost": "。清單為通過 6 項硬條件的起漲個股，",
  "table.noteStrong2": "僅供資訊參考",
  "table.notePost2": "，非投資建議。",

  // States
  "state.notReady": "資料準備中，稍候自動更新…",
  "state.notReadyHint": "盤剛開或服務剛啟動時屬正常現象。",
  "state.empty": "目前沒有符合的起漲個股",
  "state.emptyHint": "下次輪詢將自動更新。",

  // StatusBar
  "status.live": "● 盤中即時",
  "status.eod": "● 最後交易日收盤",
  "status.unknown": "● 資料源未知",
  "status.stale": " · 資料可能延遲",
  "status.stats": "掃描 {universe} 檔 · 可算 {quotable} · 漲幅池 {pool} · 入選 {count}",
  "status.warning": "⚠️ 報價限流：{msg}",
  "status.lastError": "後端錯誤：{msg}（顯示為上一份可用資料）",
  "status.connError": "連線異常：{msg}（下次輪詢將自動重試）",
  "status.notReadyAlert": "資料準備中…將自動更新",

  // 相對時間（fmtAge）
  "age.unknown": "更新時間未知",
  "age.seconds": "{n} 秒前更新",
  "age.minutes": "{n} 分鐘前更新",
  "age.hours": "{n} 小時前更新",

  // RecordsPage
  "records.title": "我的紀錄",
  "records.subtitle": "已關注 / 已設定目標價的個股，登入後跨裝置同步保存",
  "records.loadingAria": "載入紀錄中",
  "records.loadFailed": "載入失敗",
  "records.empty": "還沒有任何紀錄",
  "records.emptyHint":
    "到「篩選結果」點任一檔個股，在彈窗的「我的紀錄」填入目標價／成本價並儲存，就會出現在這裡。",
  "records.footerPre": "＊ 紀錄經 ",
  "records.footerPost": " 儲存於後端，以帳號隔離。",
  "records.tableNotePre": "＊ 多人版預備：此頁資料經 ",
  "records.tableNotePost":
    " 取得（dev 由 MSW 模擬、localStorage 暫存）。報酬率以「紀錄當下現價」對成本價試算。",

  // StockDetailModal
  "modal.aria": "{symbol} {name} 歷史走勢與紀錄",
  "modal.liveTag": "盤中即時",
  "modal.eodTag": "收盤",
  "chart.volume": "成交量(張)",
  "modal.meta": "{count} 根日K · 近 {months} 個月",
  "modal.cached": " · 快取",
  "modal.intraday": " · 含今日盤中",
  "modal.loadingHistory": "載入歷史資料中…",
  "modal.historyFailed": "歷史資料載入失敗：{msg}",
  "modal.noHistory": "查無此檔歷史資料。",
  "modal.footer": "⚠️ 歷史資訊僅供參考，非投資建議。紅K收漲 / 綠K收跌（台股慣例）。",

  // StockRecordPanel
  "recordPanel.title": "我的紀錄",
  "recordPanel.target": "目標價",
  "recordPanel.targetPlaceholder": "例如 120",
  "recordPanel.cost": "成本價",
  "recordPanel.costPlaceholder": "例如 95.5",
  "recordPanel.current": "現價",
  "recordPanel.return": "報酬率（對成本）",
  "recordPanel.upside": "距目標",
  "recordPanel.saving": "儲存中…",
  "recordPanel.saved": "已儲存 ✓",
  "recordPanel.save": "儲存",
  "recordPanel.saveError": "儲存失敗：{msg}",
  "recordPanel.recordTime": "紀錄時間：{time}",
  "recordPanel.hint": "＊ 多人版預備：已走真實 fetch /userapi，dev 由 MSW 模擬後端。",

  // Toast
  "toast.removed": "已移除",
  "toast.removeFailed": "移除失敗",
  "toast.saved": "已儲存",
  "toast.saveFailed": "儲存失敗",
  "toast.loggedOut": "已登出",

  // Auth
  "auth.lead": "登入後即可保存你的個股紀錄（目標價 / 成本價），跨裝置同步。",
  "auth.login": "登入",
  "auth.register": "註冊",
  "auth.password": "密碼",
  "auth.loggingIn": "登入中…",
  "auth.registering": "註冊中…",
  "auth.loginFailed": "登入失敗",
  "auth.registerFailed": "註冊失敗",
  "auth.noAccount": "還沒有帳號？",
  "auth.haveAccount": "已經有帳號？",
  "auth.displayName": "顯示名稱（選填）",
  "auth.displayNamePlaceholder": "例如：阿明",
  "auth.passwordPlaceholder": "至少 8 碼",
  "auth.anon": "未登入",
  "auth.logout": "登出",
  "auth.expired": "登入已過期，請重新登入",
  "auth.passwordMismatch": "兩次輸入的密碼不一致",
  "auth.passwordTooShort": "密碼至少需要 {n} 碼",

  // 忘記密碼
  "auth.forgotLink": "忘記密碼？",
  "auth.forgotTitle": "忘記密碼",
  "auth.forgotLead": "輸入註冊時使用的信箱，我們會寄一封重設密碼的連結給你。",
  "auth.forgotSubmit": "寄送重設連結",
  "auth.forgotSending": "寄送中…",
  "auth.forgotFailed": "寄送失敗，請稍後再試",
  "auth.forgotSentTitle": "已寄出",
  "auth.forgotSentBody": "如果 {email} 有註冊帳號，重設密碼的連結已經寄出了。",
  "auth.forgotSentHint": "連結 30 分鐘內有效，且只能使用一次。沒收到的話請檢查垃圾郵件匣。",
  "auth.backToLogin": "回到登入",
  "auth.backToApp": "回到首頁",
  "auth.continueToApp": "開始使用",

  // 重設密碼
  "auth.resetTitle": "設定新密碼",
  "auth.resetLead": "請輸入新的密碼，設定完成後會直接為你登入。",
  "auth.newPassword": "新密碼",
  "auth.confirmPassword": "再次輸入新密碼",
  "auth.resetSubmit": "設定新密碼",
  "auth.resetSubmitting": "設定中…",
  "auth.resetFailed": "重設失敗，連結可能已失效",
  "auth.resetDoneTitle": "密碼已更新",
  "auth.resetDoneBody": "新密碼已生效，其他裝置上的登入狀態已一併登出。",

  // 信箱驗證
  "auth.verifyOnSignupHint": "註冊後會寄一封驗證信到你的信箱；未驗證期間功能不受影響。",
  "auth.verifying": "驗證中…",
  "auth.verifyOkTitle": "信箱已驗證",
  "auth.verifyOkBody": "感謝你完成驗證，可以開始使用了。",
  "auth.verifyFailedTitle": "驗證失敗",
  "auth.verifyFailedBody": "這個連結無效或已過期。",
  "auth.verifyFailedHint": "驗證連結 24 小時內有效且只能用一次。請登入後從提醒橫幅重寄一封新的。",
  "auth.unverifiedBanner": "你的信箱 {email} 尚未驗證。",
  "auth.verifyResend": "重寄驗證信",
  "auth.verifyResending": "寄送中…",
  "auth.verifyResent": "驗證信已重寄，請至信箱收取",
  "auth.verifyResendFailed": "重寄失敗，請稍後再試",

  // 語言切換
  "lang.label": "語言",

  // 下載頁
  "dl.docTitle": "台股篩選資料下載",
  "dl.title": "台股篩選資料下載",
  "dl.sub": "下載每日篩選結果與自己的個股紀錄。篩選結果為資訊參考，非投資建議。",
  "dl.back": "← 上一頁",
  "dl.snapshotsTitle": "每日篩選快照",
  "dl.refresh": "重新整理",
  "dl.loadFailed": "載入失敗：{msg}",
  "dl.noSnapshots": "目前尚無任何篩選快照。",
  "dl.th.date": "交易日",
  "dl.th.intraday": "盤中 13:00",
  "dl.th.eod": "收盤後",
  "dl.session": "時段",
  "dl.query": "查詢",
  "dl.queryFound": "找到 {count} 檔",
  "dl.queryNotFound": "此日期查無此時段的篩選資料。",
  "dl.rangeStart": "起始日期",
  "dl.rangeEnd": "結束日期",
  "dl.rangeFound": "此範圍內共有 {days} 個交易日、{count} 檔",
  "dl.rangeNotFound": "此範圍內查無此時段的篩選資料。",
  "dl.downloadRange": "下載整段範圍 (.xlsx)",
  "dl.download": "下載 ({count})",
  "dl.snapshotHint": "「下載」旁的數字為當次篩出的起漲個股檔數。檔案為 Excel (.xlsx)。",
  "dl.coverage": "資料庫涵蓋範圍：{min} ～ {max}（共 {days} 個交易日、{total} 筆快照，資料庫大小約 {size}）",
  "dl.coverageUnknown": "尚無法取得資料庫涵蓋範圍。",
  "dl.recordsTitle": "我的個股紀錄",
  "dl.loggedInAs": "已登入：",
  "dl.downloading": "下載中…",
  "dl.downloadRecords": "下載我的紀錄 (.xlsx)",
  "dl.logout": "登出",
  "dl.loginRequired": "下載個人紀錄需先登入。",
  "dl.password": "密碼",
  "dl.loggingIn": "登入中…",
  "dl.login": "登入",
  "dl.downloadStarted": "已開始下載 my_records.xlsx",

  // ---- 回測分頁 ----
  "tab.backtest": "回測",
  "bt.title": "起漲個股回測",
  "bt.subtitle": "統計資料庫中所有被篩出的起漲個股，在第 N 個交易日後上漲的機率",
  "bt.coverage.snapshots": "篩選紀錄：{min} ～ {max}（{days} 個交易日）",
  "bt.coverage.prices": "收盤價資料：{min} ～ {max}（{days} 個交易日、{symbols} 檔）",
  "bt.noPrices": "資料庫尚無全市場每日收盤價，無法計算後續漲跌。請先在 stock_market 專案執行 python run_backfill_prices.py 回補。",
  "bt.field.mode": "比較方式",
  "bt.field.start": "起始篩選日",
  "bt.field.end": "結束篩選日",
  "bt.field.horizons": "持有天數",
  "bt.mode.intraday_to_close": "盤中 13:00 → 收盤價",
  "bt.mode.close_to_close": "收盤價 → 收盤價",
  "bt.allHistory": "全部歷史",
  "bt.horizonsHint": "點選要統計的交易日數（可複選）。N=0 表示「13:00 買進、當日收盤結算」，只有盤中模式適用。",
  "bt.run": "開始回測",
  "bt.downloadXlsx": "下載明細 (.xlsx)",
  "bt.idle": "設定條件後按「開始回測」",
  "bt.idleHint": "預設涵蓋資料庫中全部的篩選紀錄。",
  "bt.emptyRange": "此區間與比較方式查無篩選紀錄",
  "bt.emptyRangeHint": "換個日期範圍，或改用另一種比較方式試試。",
  "bt.hero.label": "持有 {n} 個交易日的上漲機率",
  "bt.hero.sub": "{samples} 筆樣本中有 {wins} 筆上漲",
  "bt.fact.signals": "訊號筆數",
  "bt.fact.days": "篩選日數",
  "bt.fact.avg": "平均報酬",
  "bt.fact.median": "中位數報酬",
  "bt.chart.title": "各持有天數的上漲機率（虛線 = 50%，漲跌各半）",
  "bt.chart.xTitle": "持有交易日數 N",
  "bt.chart.xLabel": "N={n}",
  "bt.chart.noData": "無資料",
  "bt.chart.tipWinRate": "上漲機率 ",
  "bt.chart.tipSamples": "樣本數 ",
  "bt.chart.tipMissing": "（另有 {n} 筆缺價未計）",
  "bt.chart.tipAvg": "平均報酬 ",
  "bt.th.n": "持有天數",
  "bt.th.samples": "樣本數",
  "bt.th.wins": "上漲",
  "bt.th.losses": "下跌",
  "bt.th.flat": "持平",
  "bt.th.missing": "無資料",
  "bt.th.winRate": "上漲機率",
  "bt.th.avg": "平均報酬",
  "bt.th.median": "中位數",
  "bt.th.best": "最佳",
  "bt.th.worst": "最差",
  "bt.th.screenDate": "篩選日",
  "bt.th.entry": "進場價",
  "bt.th.exitDate": "出場日",
  "bt.th.exit": "出場價",
  "bt.th.return": "報酬率",
  "bt.tableNote": "「無資料」為尚未經過 N 個交易日、或該日收盤價未回補而未列入統計的筆數 —— 這些不會被當成持平或下跌。點圖上的長條可切換下方明細。",
  "bt.detailTitle": "N={n} 個交易日後的個股明細",
  "bt.detailCount": "（顯示 {shown} / 共 {total} 筆）",
  "bt.footer": "⚠️ 回測為歷史統計資訊參考，過去表現不代表未來績效，非投資建議。未考慮手續費、交易稅、滑價與流動性。",
};

const en: Dict = {
  // common
  "common.loading": "Loading…",
  "common.reload": "Reload",
  "common.remove": "Remove",
  "common.close": "Close",
  "common.dash": "—",
  "common.notAdvice": "not investment advice",

  // document title
  "app.docTitle": "TW Stock Intraday Breakout Screener",

  // tabs
  "tab.screen": "Screening Results",
  "tab.records": "My Records",

  // Header
  "header.title": "TW Stock Intraday Breakout Screener",
  "header.subtitle": "Live list of breakout stocks passing all 6 hard conditions",
  "header.downloadLink": "Data Download",
  "disclaimer.pre": "⚠️ Results are probabilistic reference information, ",
  "disclaimer.post": ".",

  // ScreenPage footer
  "screen.footer":
    "⚠️ Results are probabilistic reference information, not investment advice. The data source switches automatically by trading hours (live / close).",

  // Controls
  "controls.show": "Rows",
  "controls.all": "All",
  "controls.topN": "Top {n}",
  "controls.filters": "Filters",
  "controls.adjusted": "Modified",
  "controls.reset": "Reset to defaults",
  "controls.group.pool": "Gainer pool (stage 1)",
  "controls.group.breakout": "Breakout 6 conditions (stage 2)",
  "controls.field.minChange": "Min. change",
  "controls.field.excludeLimitUp": "Exclude locked limit-up",
  "controls.hint.excludeLimitUp": "close ≤ one tick below limit",
  "controls.field.volRatio": "Volume multiple",
  "controls.hint.volRatio": "today vol / prev vol ≥",
  "controls.field.maShort": "Short MA days",
  "controls.hint.maShort": "default 5MA",
  "controls.field.maMid": "Monthly MA days",
  "controls.hint.maMid": "default 20MA",
  "controls.field.maSlope": "MA slope lookback",
  "controls.hint.maSlope": "today vs N days ago",
  "controls.field.volProjection": "Project full-day volume",
  "controls.hint.volProjection": "fairer in early session",
  "controls.note":
    "Red candle, breaking yesterday's high, and prior day below the short MA are fixed conditions and cannot be changed.",

  // table headers
  "th.symbol": "Symbol / Name",
  "th.market": "Market",
  "th.price": "Price",
  "th.change": "Change",
  "th.lots": "Vol (lots)",
  "th.volRatio": "Vol ratio",
  "th.cost": "Cost",
  "th.target": "Target",
  "th.return": "Return",
  "th.upside": "To target",
  "th.time": "Recorded at",
  "th.action": "Action",

  // StockTable
  "table.viewHistory": "View historical chart & records",
  "table.notePre": "Click any row to view ",
  "table.noteStrong": "historical chart + my records",
  "table.notePost": ". The list shows breakout stocks passing all 6 hard conditions, ",
  "table.noteStrong2": "for reference only",
  "table.notePost2": ", not investment advice.",

  // States
  "state.notReady": "Preparing data, will refresh automatically…",
  "state.notReadyHint": "Normal right after market open or service start.",
  "state.empty": "No matching breakout stocks right now",
  "state.emptyHint": "Will refresh on the next poll.",

  // StatusBar
  "status.live": "● Live (intraday)",
  "status.eod": "● Last trading day close",
  "status.unknown": "● Unknown source",
  "status.stale": " · data may be delayed",
  "status.stats": "Scanned {universe} · quotable {quotable} · pool {pool} · selected {count}",
  "status.warning": "⚠️ Quote rate-limited: {msg}",
  "status.lastError": "Backend error: {msg} (showing last available data)",
  "status.connError": "Connection error: {msg} (will retry on next poll)",
  "status.notReadyAlert": "Preparing data… will refresh automatically",

  // relative time
  "age.unknown": "update time unknown",
  "age.seconds": "updated {n}s ago",
  "age.minutes": "updated {n}m ago",
  "age.hours": "updated {n}h ago",

  // RecordsPage
  "records.title": "My Records",
  "records.subtitle": "Stocks you follow / have a target price for; synced across devices after sign-in",
  "records.loadingAria": "Loading records",
  "records.loadFailed": "Failed to load",
  "records.empty": "No records yet",
  "records.emptyHint":
    "Go to \"Screening Results\", click any stock, fill in target / cost price in the \"My Records\" panel of the dialog and save — it will show up here.",
  "records.footerPre": "* Records are stored on the backend via ",
  "records.footerPost": ", isolated per account.",
  "records.tableNotePre": "* Multi-user ready: this page loads data via ",
  "records.tableNotePost":
    " (mocked by MSW + localStorage in dev). Return is estimated against cost using the price at record time.",

  // StockDetailModal
  "modal.aria": "{symbol} {name} historical chart & records",
  "modal.liveTag": "Live",
  "modal.eodTag": "Close",
  "chart.volume": "Volume (lots)",
  "modal.meta": "{count} daily candles · last {months} months",
  "modal.cached": " · cached",
  "modal.intraday": " · incl. today intraday",
  "modal.loadingHistory": "Loading historical data…",
  "modal.historyFailed": "Failed to load historical data: {msg}",
  "modal.noHistory": "No historical data for this stock.",
  "modal.footer":
    "⚠️ Historical info is for reference only, not investment advice. Red candle = up / green = down (TW convention).",

  // StockRecordPanel
  "recordPanel.title": "My Records",
  "recordPanel.target": "Target price",
  "recordPanel.targetPlaceholder": "e.g. 120",
  "recordPanel.cost": "Cost price",
  "recordPanel.costPlaceholder": "e.g. 95.5",
  "recordPanel.current": "Price",
  "recordPanel.return": "Return (vs cost)",
  "recordPanel.upside": "To target",
  "recordPanel.saving": "Saving…",
  "recordPanel.saved": "Saved ✓",
  "recordPanel.save": "Save",
  "recordPanel.saveError": "Save failed: {msg}",
  "recordPanel.recordTime": "Recorded at: {time}",
  "recordPanel.hint": "* Multi-user ready: real fetch to /userapi; backend mocked by MSW in dev.",

  // Toast
  "toast.removed": "Removed",
  "toast.removeFailed": "Remove failed",
  "toast.saved": "Saved",
  "toast.saveFailed": "Save failed",
  "toast.loggedOut": "Signed out",

  // Auth
  "auth.lead": "Sign in to save your stock records (target / cost price) and sync across devices.",
  "auth.login": "Sign in",
  "auth.register": "Sign up",
  "auth.password": "Password",
  "auth.loggingIn": "Signing in…",
  "auth.registering": "Signing up…",
  "auth.loginFailed": "Sign-in failed",
  "auth.registerFailed": "Sign-up failed",
  "auth.noAccount": "No account yet?",
  "auth.haveAccount": "Already have an account?",
  "auth.displayName": "Display name (optional)",
  "auth.displayNamePlaceholder": "e.g. Ming",
  "auth.passwordPlaceholder": "at least 8 characters",
  "auth.anon": "Not signed in",
  "auth.logout": "Sign out",
  "auth.expired": "Session expired, please sign in again",
  "auth.passwordMismatch": "The two passwords don't match",
  "auth.passwordTooShort": "Password must be at least {n} characters",

  // forgot password
  "auth.forgotLink": "Forgot your password?",
  "auth.forgotTitle": "Forgot password",
  "auth.forgotLead":
    "Enter the email you signed up with and we'll send you a reset link.",
  "auth.forgotSubmit": "Send reset link",
  "auth.forgotSending": "Sending…",
  "auth.forgotFailed": "Couldn't send the email. Please try again later.",
  "auth.forgotSentTitle": "Check your inbox",
  "auth.forgotSentBody":
    "If {email} has an account, a password reset link is on its way.",
  "auth.forgotSentHint":
    "The link is valid for 30 minutes and can only be used once. Check your spam folder if it doesn't arrive.",
  "auth.backToLogin": "Back to sign in",
  "auth.backToApp": "Back to the app",
  "auth.continueToApp": "Continue",

  // reset password
  "auth.resetTitle": "Set a new password",
  "auth.resetLead": "Choose a new password — we'll sign you in once it's set.",
  "auth.newPassword": "New password",
  "auth.confirmPassword": "Confirm new password",
  "auth.resetSubmit": "Set new password",
  "auth.resetSubmitting": "Saving…",
  "auth.resetFailed": "Reset failed — the link may have expired",
  "auth.resetDoneTitle": "Password updated",
  "auth.resetDoneBody":
    "Your new password is active, and sessions on other devices have been signed out.",

  // email verification
  "auth.verifyOnSignupHint":
    "We'll email you a verification link. Nothing is blocked while you wait.",
  "auth.verifying": "Verifying…",
  "auth.verifyOkTitle": "Email verified",
  "auth.verifyOkBody": "Thanks for confirming — you're all set.",
  "auth.verifyFailedTitle": "Verification failed",
  "auth.verifyFailedBody": "This link is invalid or has expired.",
  "auth.verifyFailedHint":
    "Verification links last 24 hours and work once. Sign in and use the banner to send a new one.",
  "auth.unverifiedBanner": "Your email {email} isn't verified yet.",
  "auth.verifyResend": "Resend email",
  "auth.verifyResending": "Sending…",
  "auth.verifyResent": "Verification email sent — check your inbox",
  "auth.verifyResendFailed": "Couldn't resend. Please try again later.",

  // language switch
  "lang.label": "Language",

  // download page
  "dl.docTitle": "TW Stock Screening — Data Download",
  "dl.title": "TW Stock Screening — Data Download",
  "dl.sub":
    "Download daily screening results and your own stock records. Results are reference information, not investment advice.",
  "dl.back": "← Back",
  "dl.snapshotsTitle": "Daily screening snapshots",
  "dl.refresh": "Refresh",
  "dl.loadFailed": "Failed to load: {msg}",
  "dl.noSnapshots": "No screening snapshots yet.",
  "dl.th.date": "Trade date",
  "dl.th.intraday": "Intraday 13:00",
  "dl.th.eod": "After close",
  "dl.session": "Session",
  "dl.query": "Query",
  "dl.queryFound": "{count} stocks found",
  "dl.queryNotFound": "No screening data for this date/session.",
  "dl.rangeStart": "Start date",
  "dl.rangeEnd": "End date",
  "dl.rangeFound": "{days} trading day(s), {count} stocks in this range",
  "dl.rangeNotFound": "No screening data for this range/session.",
  "dl.downloadRange": "Download range (.xlsx)",
  "dl.download": "Download ({count})",
  "dl.snapshotHint": "The number next to \"Download\" is how many breakout stocks were selected that run. Files are Excel (.xlsx).",
  "dl.coverage": "Database coverage: {min} to {max} ({days} trading days, {total} snapshots, size ≈ {size})",
  "dl.coverageUnknown": "Database coverage is not available yet.",
  "dl.recordsTitle": "My stock records",
  "dl.loggedInAs": "Signed in: ",
  "dl.downloading": "Downloading…",
  "dl.downloadRecords": "Download my records (.xlsx)",
  "dl.logout": "Sign out",
  "dl.loginRequired": "Sign in to download personal records.",
  "dl.password": "Password",
  "dl.loggingIn": "Signing in…",
  "dl.login": "Sign in",
  "dl.downloadStarted": "Started downloading my_records.xlsx",
  // ---- Backtest tab ----
  "tab.backtest": "Backtest",
  "bt.title": "Breakout backtest",
  "bt.subtitle": "How often every stock this system has flagged was worth more N trading days later",
  "bt.coverage.snapshots": "Screening records: {min} to {max} ({days} trading days)",
  "bt.coverage.prices": "Price data: {min} to {max} ({days} trading days, {symbols} symbols)",
  "bt.noPrices": "No whole-market daily closes in the database yet, so forward returns cannot be computed. Run python run_backfill_prices.py in the stock_market project first.",
  "bt.field.mode": "Comparison",
  "bt.field.start": "From (screening day)",
  "bt.field.end": "To (screening day)",
  "bt.field.horizons": "Holding period",
  "bt.mode.intraday_to_close": "13:00 intraday to close",
  "bt.mode.close_to_close": "Close to close",
  "bt.allHistory": "All history",
  "bt.run": "Run backtest",
  "bt.horizonsHint": "Pick the holding periods to measure. N=0 means \"bought at 13:00, marked at that day's close\" and applies to the intraday mode only.",
  "bt.downloadXlsx": "Download detail (.xlsx)",
  "bt.idle": "Set the parameters, then run the backtest",
  "bt.idleHint": "Defaults to every screening record in the database.",
  "bt.emptyRange": "No screening records for this range and comparison",
  "bt.emptyRangeHint": "Try a different date range, or the other comparison.",
  "bt.hero.label": "Chance of being up after {n} trading day(s)",
  "bt.hero.sub": "{wins} of {samples} samples closed higher",
  "bt.fact.signals": "Signals",
  "bt.fact.days": "Screening days",
  "bt.fact.avg": "Mean return",
  "bt.fact.median": "Median return",
  "bt.chart.title": "Chance of being up, by holding period (dashed line = 50%, a coin flip)",
  "bt.chart.xTitle": "Trading days held (N)",
  "bt.chart.xLabel": "N={n}",
  "bt.chart.noData": "no data",
  "bt.chart.tipWinRate": "Up rate ",
  "bt.chart.tipSamples": "Samples ",
  "bt.chart.tipMissing": " ({n} excluded, no price)",
  "bt.chart.tipAvg": "Mean return ",
  "bt.th.n": "Held",
  "bt.th.samples": "Samples",
  "bt.th.wins": "Up",
  "bt.th.losses": "Down",
  "bt.th.flat": "Flat",
  "bt.th.missing": "No data",
  "bt.th.winRate": "Up rate",
  "bt.th.avg": "Mean",
  "bt.th.median": "Median",
  "bt.th.best": "Best",
  "bt.th.worst": "Worst",
  "bt.th.screenDate": "Screened",
  "bt.th.entry": "Entry",
  "bt.th.exitDate": "Exit date",
  "bt.th.exit": "Exit",
  "bt.th.return": "Return",
  "bt.tableNote": "\"No data\" counts entries excluded because N trading days have not passed yet, or the closing price for that day was never uploaded — they are never treated as flat or losing trades. Click a bar to switch the detail below.",
  "bt.detailTitle": "Per-stock detail at N={n}",
  "bt.detailCount": " (showing {shown} of {total})",
  "bt.footer": "\u26a0\ufe0f Backtests are historical reference information; past performance does not predict future results. Not investment advice. Fees, transaction tax, slippage and liquidity are not modelled.",
};

const messages: Record<Locale, Dict> = { "zh-TW": zhTW, en };

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "zh-TW" || saved === "en") return saved;
  } catch {
    /* localStorage 不可用 */
  }
  return "zh-TW";
}

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m,
  );
}

/** 不需 React context 的純翻譯（給 entry point 設定文件標題等用） */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const raw = messages[locale]?.[key] ?? messages["zh-TW"][key] ?? key;
  return interpolate(raw, vars);
}

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFunc;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, locale);
    } catch {
      /* 忽略 */
    }
    document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback<TFunc>(
    (key, vars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<I18nCtx>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n 必須在 <I18nProvider> 內使用");
  return c;
}

/** 便捷取得 t() */
export function useT(): TFunc {
  return useI18n().t;
}
