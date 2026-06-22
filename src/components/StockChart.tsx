// src/components/StockChart.tsx
// 用 lightweight-charts 畫「K棒 + 成交量 + MA5/20/60」。台股慣例：紅K收漲、綠K收跌。
// 圖表只建立一次；candles 變動時用 setData 更新（保留使用者縮放，只在首次 fitContent）。
// currentPrice 變動時更新一條水平「現價線」，盤中輪詢即可即時反映最新價。
import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../types/history";

const UP = "#e02e3d"; // 漲 = 紅
const DOWN = "#18a058"; // 跌 = 綠

const MA_DEFS: { key: "ma5" | "ma20" | "ma60"; color: string }[] = [
  { key: "ma5", color: "#f59e0b" },
  { key: "ma20", color: "#2563eb" },
  { key: "ma60", color: "#7c3aed" },
];

/** "YYYY-MM-DD" 直接作為 lightweight-charts 的 business-day time */
function toTime(d: string): Time {
  return d as unknown as Time;
}

export function StockChart({
  candles,
  currentPrice = null,
}: {
  candles: Candle[];
  currentPrice?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const didFitRef = useRef(false);

  // 建立圖表（只一次）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
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
    chartRef.current = chart;

    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });

    volSeriesRef.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

    maSeriesRef.current = MA_DEFS.map((m) =>
      chart.addLineSeries({
        color: m.color,
        lineWidth: 2,
        // 不在圖上顯示 MA5/MA20/MA60 文字標籤（圖例已另外標示）
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    );

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      maSeriesRef.current = [];
      priceLineRef.current = null;
      didFitRef.current = false;
    };
  }, []);

  // 資料更新（candles 變動時）
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volSeries = volSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volSeries || !chart) return;

    // 只取 OHLC 完整的日K（缺值不畫 K 棒，避免 lightweight-charts 報錯）
    const valid = candles.filter(
      (c) => c.open != null && c.high != null && c.low != null && c.close != null,
    );

    candleSeries.setData(
      valid.map((c) => ({
        time: toTime(c.date),
        open: c.open as number,
        high: c.high as number,
        low: c.low as number,
        close: c.close as number,
      })) as CandlestickData[],
    );

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

    MA_DEFS.forEach((m, idx) => {
      const line = maSeriesRef.current[idx];
      if (!line) return;
      line.setData(
        valid
          .filter((c) => c[m.key] != null)
          .map((c) => ({ time: toTime(c.date), value: c[m.key] as number })) as LineData[],
      );
    });

    // 只在第一次有資料時自動框選範圍；之後保留使用者的縮放/平移
    if (!didFitRef.current && valid.length > 0) {
      chart.timeScale().fitContent();
      didFitRef.current = true;
    }
  }, [candles]);

  // 現價線（currentPrice 變動時）
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    if (priceLineRef.current) {
      candleSeries.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (currentPrice != null && !Number.isNaN(currentPrice)) {
      priceLineRef.current = candleSeries.createPriceLine({
        price: currentPrice,
        color: "#2563eb",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        // 不顯示「現價」文字標籤；保留虛線與右側價格刻度
        title: "",
      });
    }
  }, [currentPrice]);

  return <div ref={containerRef} className="stock-chart" />;
}
