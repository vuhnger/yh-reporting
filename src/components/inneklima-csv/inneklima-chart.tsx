"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { nb } from "date-fns/locale";

import type { InneklimaSample } from "@/lib/inneklima-csv";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Colors match the convention used in existing reports (avarn/Hammerfest):
// "den oransje grafen angir Temperatur, den grønne CO2, den blå luftfuktighet"
const COLOR_TEMPERATURE = "#f97316";
const COLOR_HUMIDITY = "#3b82f6";
const COLOR_CO2 = "#22c55e";

// Static – hoisted out of the component so Chart.js does not see a fresh object on every render.
const CHART_OPTIONS: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  // Animations disabled so the canvas is fully painted before we capture it as PNG.
  animation: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { position: "bottom" },
    tooltip: {
      callbacks: {
        title(items) {
          const ts = items[0]?.parsed.x;
          if (typeof ts !== "number") return "";
          return new Date(ts).toLocaleString("nb-NO");
        },
      },
    },
  },
  scales: {
    x: {
      type: "time",
      adapters: { date: { locale: nb } },
      time: {
        tooltipFormat: "dd.MM.yyyy HH:mm",
        displayFormats: {
          hour: "dd.MM HH:mm",
          day: "dd.MM",
        },
      },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    },
    yTemp: {
      type: "linear",
      position: "left",
      title: { display: true, text: "Temperatur (°C)", color: COLOR_TEMPERATURE },
      ticks: { color: COLOR_TEMPERATURE },
      grid: { display: true },
    },
    yRh: {
      type: "linear",
      position: "right",
      title: { display: true, text: "Luftfuktighet (%RH)", color: COLOR_HUMIDITY },
      ticks: { color: COLOR_HUMIDITY },
      grid: { display: false },
    },
    yCo2: {
      type: "linear",
      position: "right",
      offset: true,
      title: { display: true, text: "CO2 (ppm)", color: COLOR_CO2 },
      ticks: { color: COLOR_CO2 },
      grid: { display: false },
    },
  },
};

interface InneklimaChartProps {
  samples: InneklimaSample[];
  /**
   * Called once after each chart render with a PNG data URL of the chart.
   * Used to populate `sensor.chartImage` so the report PDF/Word picks it up.
   */
  onImageReady?: (dataUrl: string) => void;
  height?: number;
}

export function InneklimaChart({ samples, onImageReady, height = 320 }: InneklimaChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null);

  // Keep the latest callback in a ref so we can call it without putting it in
  // the effect's dependency array. This avoids re-capturing the chart whenever
  // the parent re-renders with a fresh inline callback.
  const onImageReadyRef = useRef(onImageReady);
  useEffect(() => {
    onImageReadyRef.current = onImageReady;
  }, [onImageReady]);

  const data = useMemo<ChartData<"line", { x: number; y: number | null }[]>>(() => {
    return {
      datasets: [
        {
          label: "Temperatur (°C)",
          data: samples.map((s) => ({ x: s.timestamp.getTime(), y: s.temperatureC })),
          borderColor: COLOR_TEMPERATURE,
          backgroundColor: COLOR_TEMPERATURE,
          yAxisID: "yTemp",
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.2,
          spanGaps: true,
        },
        {
          label: "Luftfuktighet (%RH)",
          data: samples.map((s) => ({ x: s.timestamp.getTime(), y: s.relativeHumidity })),
          borderColor: COLOR_HUMIDITY,
          backgroundColor: COLOR_HUMIDITY,
          yAxisID: "yRh",
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.2,
          spanGaps: true,
        },
        {
          label: "CO2 (ppm)",
          data: samples.map((s) => ({ x: s.timestamp.getTime(), y: s.co2Ppm })),
          borderColor: COLOR_CO2,
          backgroundColor: COLOR_CO2,
          yAxisID: "yCo2",
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.2,
          spanGaps: true,
        },
      ],
    };
  }, [samples]);

  // Identity proxy for the underlying samples – cheap to recompute, primitive-only.
  const firstTs = samples[0]?.timestamp.getTime() ?? 0;
  const lastTs = samples[samples.length - 1]?.timestamp.getTime() ?? 0;
  const sampleCount = samples.length;

  useEffect(() => {
    if (sampleCount === 0) return;
    const chart = chartRef.current;
    if (!chart) return;
    const dataUrl = chart.toBase64Image("image/png", 1.0);
    onImageReadyRef.current?.(dataUrl);
  }, [sampleCount, firstTs, lastTs]);

  return (
    <div style={{ height }}>
      <Line ref={chartRef} data={data} options={CHART_OPTIONS} />
    </div>
  );
}
