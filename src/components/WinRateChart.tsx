// src/components/WinRateChart.tsx
// 「持有 N 個交易日的上漲機率」長條圖。內嵌 SVG，無額外相依。
//
// 幾個刻意的取捨：
//
// * 單一序列、單一顏色。這張圖問的是「多大」而不是「哪一類」，所以不需要色票組，
//   也就不需要圖例 —— 標題已經說明它是什麼。
// * 只畫上漲機率，不把平均報酬疊上來。兩個量級不同的量放在同一張圖必然得配兩條
//   Y 軸，而雙軸圖能讓任何兩條線看起來相關 —— 平均與中位數報酬留在下方表格裡。
// * 樣本數為 0 的 N 不畫成 0% 的長條，而是留白並標「無資料」。一根貼地的長條會被
//   讀成「這個天數勝率是零」，那是完全相反的意思。
// * 50% 參考線是這張圖的重點：長條高於它才代表「上漲比下跌多」。
import { useState } from "react";
import type { HorizonStat } from "../types/backtest";
import { useI18n } from "../i18n";
import { DASH, fmtPct } from "../utils/format";

const BAR_COLOR = "#2563eb";
const BAR_COLOR_HOVER = "#1d4ed8";

// viewBox 座標；SVG 以 width="100%" 等比縮放，所以這些是「相對比例」而非像素。
const W = 640;
const H = 236;
const PAD = { top: 26, right: 16, bottom: 50, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BAR_GAP = 14; // 相鄰長條之間的留白（含 marks-and-anatomy 要求的 2px 表面間隙）
const MAX_BAR_W = 64;

/** 上緣圓角、下緣貼齊基線的長條路徑。 */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.min(r, w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

export function WinRateChart({
  stats,
  activeN,
  onSelectN,
}: {
  stats: HorizonStat[];
  activeN: number;
  onSelectN?: (n: number) => void;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);

  if (stats.length === 0) return null;

  const slot = PLOT_W / stats.length;
  const barW = Math.min(MAX_BAR_W, Math.max(8, slot - BAR_GAP));
  const yOf = (pct: number) => PAD.top + PLOT_H * (1 - pct / 100);
  const xOf = (i: number) => PAD.left + slot * i + (slot - barW) / 2;

  const hovered = hover == null ? null : stats[hover];

  return (
    <figure className="wr-chart">
      <figcaption className="wr-chart__caption">{t("bt.chart.title")}</figcaption>
      <div className="wr-chart__frame">
        <svg
          className="wr-chart__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t("bt.chart.title")}
          onMouseLeave={() => setHover(null)}
        >
          {/* 網格 + Y 軸刻度（退居背景，不與資料爭注意力）。
              50% 那條是這張圖的判讀基準，用虛線 + 加粗刻度標出來；不在圖面上另外
              放一段說明文字 —— 那段文字無論靠左靠右都會壓到某一根長條，說明改寫在
              上方標題裡。 */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yOf(pct)}
                y2={yOf(pct)}
                className={pct === 50 ? "wr-chart__ref" : "wr-chart__grid"}
              />
              <text
                x={PAD.left - 8}
                y={yOf(pct) + 4}
                textAnchor="end"
                className={pct === 50 ? "wr-chart__tick is-ref" : "wr-chart__tick"}
              >
                {pct}%
              </text>
            </g>
          ))}

          {stats.map((s, i) => {
            const x = xOf(i);
            const isActive = s.n === activeN;
            const label = t("bt.chart.xLabel", { n: s.n });
            if (s.win_rate == null) {
              // 無樣本：留白 + 說明，絕不畫成 0%。
              return (
                <g key={s.n}>
                  <text
                    x={x + barW / 2}
                    y={yOf(18)}
                    textAnchor="middle"
                    className="wr-chart__nodata"
                  >
                    {t("bt.chart.noData")}
                  </text>
                  <text
                    x={x + barW / 2}
                    y={H - PAD.bottom + 20}
                    textAnchor="middle"
                    className={`wr-chart__xlabel ${isActive ? "is-active" : ""}`}
                  >
                    {label}
                  </text>
                </g>
              );
            }
            const pct = s.win_rate * 100;
            const y = yOf(pct);
            const h = yOf(0) - y;
            return (
              <g
                key={s.n}
                className="wr-chart__bargroup"
                onMouseEnter={() => setHover(i)}
                onClick={() => onSelectN?.(s.n)}
              >
                {/* 命中區比長條本身寬，滑鼠不必精準對準細長條 */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={PLOT_H}
                  fill="transparent"
                />
                <path
                  d={barPath(x, y, barW, h)}
                  fill={hover === i ? BAR_COLOR_HOVER : BAR_COLOR}
                  className={isActive ? "wr-chart__bar is-active" : "wr-chart__bar"}
                />
                <text
                  x={x + barW / 2}
                  y={y - 8}
                  textAnchor="middle"
                  className="wr-chart__value"
                >
                  {pct.toFixed(1)}%
                </text>
                <text
                  x={x + barW / 2}
                  y={H - PAD.bottom + 20}
                  textAnchor="middle"
                  className={`wr-chart__xlabel ${isActive ? "is-active" : ""}`}
                >
                  {label}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(0)}
            y2={yOf(0)}
            className="wr-chart__axis"
          />
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            className="wr-chart__axistitle"
          >
            {t("bt.chart.xTitle")}
          </text>
        </svg>

        {hovered && (
          <div className="wr-chart__tip" role="status">
            <strong>{t("bt.chart.xLabel", { n: hovered.n })}</strong>
            <span>
              {t("bt.chart.tipWinRate")}
              <b>{hovered.win_rate == null ? DASH : `${(hovered.win_rate * 100).toFixed(1)}%`}</b>
            </span>
            <span>
              {t("bt.chart.tipSamples")}
              <b>{hovered.samples.toLocaleString()}</b>
              {hovered.missing > 0 && (
                <em>{t("bt.chart.tipMissing", { n: hovered.missing })}</em>
              )}
            </span>
            <span>
              {t("bt.chart.tipAvg")}
              <b>{fmtPct(hovered.avg_return_pct)}</b>
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
