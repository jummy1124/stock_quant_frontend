// src/utils/format.ts
// 顯示用格式化工具，全部對 null 做防護，缺漏一律顯示 "—"。

export const DASH = "—";

/** 數字 toFixed，null/NaN → "—" */
export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return DASH;
  return v.toFixed(digits);
}

/** 百分比，附帶正負號與 "%"；null → "—" */
export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return DASH;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

/** 漲跌價，附帶正負號；null → "—" */
export function fmtChange(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return DASH;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}`;
}

/** 量比，1 位小數 + "x"；null → "—" */
export function fmtRatio(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return DASH;
  return `${v.toFixed(2)}x`;
}

/** 張數，整數 + 千分位；null → "—" */
export function fmtLots(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return DASH;
  return Math.round(v).toLocaleString("zh-TW");
}

/**
 * 台股紅漲綠跌：> 0 紅、< 0 綠、其餘中性。
 * 回傳 CSS class 名稱。
 */
export function changeClass(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v) || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}

/** age_seconds → 相對時間「N 秒前 / N 分鐘前更新」 */
export function fmtAge(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "更新時間未知";
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} 秒前更新`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分鐘前更新`;
  const h = Math.floor(m / 60);
  return `${h} 小時前更新`;
}

/** age_seconds 是否視為延遲 (> 180 秒) */
export function isStale(sec: number | null | undefined): boolean {
  return sec != null && sec > 180;
}

/** generated_at ISO → 本地時間字串 (HH:mm:ss) */
export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("zh-TW", { hour12: false });
}

/** ISO → 本地「YYYY-MM-DD HH:mm」，給紀錄時間用；null → "—" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
