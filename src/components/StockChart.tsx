// src/components/StockChart.tsx
// 用 lightweight-charts 畫「K棒 + 成交量 + MA5/20/60」。台股慣例：紅K收漲、綠K收跌。
import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../types/history";

const UP = "#e02e3d"; // 漲 = 紅
const DOWN = "#18a058"; // 跌 = 綠

const MA_DEFS: { key: "ma5" | "ma20" | "ma60"; color: string; title: string }[] = [
  { key: "ma5", color: "#f59e0b", title: "MA5" },
  { key: "ma20", color: "#2563eb", title: "MA20" },
  { key: "ma60", color: "#7c3aed", title: "MA60" },
];

/** "YYYY-MM-DD" 直接作為 lightweight-charts 的 business-day time */
function toTime(d: string): Time {
  return d as unknown as Time;
}

export function StockChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart: IChartApi = createChart(el, {
      width: el.clientWidth || 640,
      height: el.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#1f2733",
        fontFamily: '"Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif',
      },
      grid: {
        vertLines: { color: "#f0f1f3" },
        horzLines: { color: "#f0f1f3" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "#e3e6ea",
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: { borderColor: "#e3e6ea", rightOffset: 4 },
      localization: { locale: "zh-TW" },
    });

    // 只取 OHLC 完整的日K（缺值不畫 K 棒，避免 lightweight-charts 報錯）
    const valid = candles.filter(
      (c) => c.open != null && c.high != null && c.low != null && c.close != null,
    );

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candleSeries.setData(
      valid.map((c) => ({
        time: toTime(c.date),
        open: c.open as number,
        high: c.high as number,
        low: c.low as number,
        close: c.close as number,
      })) as CandlestickData[],
    );

    // 成交量（張）放底部獨立刻度
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    volSeries.setData(
      valid.map((c) => {
        const up = c.close != null && c.open != null && c.close >= c.open;
        return {
          time: toTime(c.date),
          value: c.lots ?? 0,
          color: up ? "rgba(224,46,61,0.45)" : "rgba(24,160,88,0.45)",
        };
      }) as HistogramData[],
    );

    // 均線：缺值的點略過（不畫斷線突兀的 0）
    for (const m of MA_DEFS) {
      const line = chart.addLineSeries({
        color: m.color,
        lineWidth: 2,
        title: m.title,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(
        valid
          .filter((c) => c[m.key] != null)
          .map((c) => ({ time: toTime(c.date), value: c[m.key] as number })) as LineData[],
      );
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles]);

  return <div ref={containerRef} className="stock-chart" />;
}
