import type {
  Candle,
  CrashEvent,
  CrashFeatureKey,
  IndicatorPoint,
} from "../types";
import type { ScoredPoint } from "../crash-detection";

export function dateAt(offsetDays: number): string {
  const base = new Date(Date.UTC(2020, 0, 1));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

export function buildSyntheticCandles(
  length: number,
  options?: { startPrice?: number; drift?: number; symbolWave?: number },
): Candle[] {
  const startPrice = options?.startPrice ?? 100;
  const drift = options?.drift ?? 0.22;
  const symbolWave = options?.symbolWave ?? 0.9;

  const candles: Candle[] = [];
  let prevClose = startPrice;

  for (let i = 0; i < length; i += 1) {
    const baseMove = drift + Math.sin(i / 9) * symbolWave;
    const shock =
      i % 67 === 0
        ? -6
        : i % 89 === 0
          ? -8
          : i % 41 === 0
            ? 3
            : 0;
    const close = Math.max(1, prevClose + baseMove + shock);
    const open = prevClose + Math.sin(i / 5) * 0.4;
    const high = Math.max(open, close) + 1.4;
    const low = Math.min(open, close) - 1.1;
    const volume = 100_000 + (i % 12) * 4_000 + Math.round(Math.abs(shock) * 1_500);

    candles.push({
      date: dateAt(i),
      open,
      high,
      low,
      close,
      volume,
    });

    prevClose = close;
  }

  return candles;
}

export function buildIndicatorPoint(input: {
  index: number;
  close?: number;
  drawdownRate?: number | null;
  drawdownSpeed?: number | null;
  crashScore?: number | null;
  rsi?: number | null;
  sma200?: number | null;
  slope200?: number | null;
  regime200?: number | null;
  volumeShock?: number | null;
  atrPct?: number | null;
  zScore?: number | null;
  crsi?: number | null;
  gapDownFreq?: number | null;
  breadth?: number | null;
  is52wLow?: boolean | null;
}): ScoredPoint {
  const close = input.close ?? 100;
  const open = close;
  const high = close + 1;
  const low = close - 1;

  return {
    date: dateAt(input.index),
    open,
    high,
    low,
    close,
    volume: 100_000,
    dayReturnPct: 0,
    zScore: input.zScore ?? -1.2,
    rsi: input.rsi ?? 30,
    crsi: input.crsi ?? 24,
    drawdownRate: input.drawdownRate ?? -0.12,
    drawdownSpeed5: input.drawdownSpeed ?? -0.04,
    drawdownSpeed10: input.drawdownSpeed ?? -0.08,
    drawdownSpeed: input.drawdownSpeed ?? -0.08,
    atr: 2.4,
    atrPct: input.atrPct ?? 2.3,
    volumeShock: input.volumeShock ?? 1.6,
    sma200: input.sma200 ?? 110,
    slope200: input.slope200 ?? -0.2,
    below200: true,
    regime200: input.regime200 ?? 1,
    gapDownPct: -1.1,
    gapDownFreq: input.gapDownFreq ?? 2.4,
    is52wLow: input.is52wLow ?? false,
    breadth: input.breadth ?? 42,
    crashScore: input.crashScore ?? null,
    signals: {},
  };
}

export function buildFullMetrics(
  overrides?: Partial<Record<CrashFeatureKey, number>>,
): Record<CrashFeatureKey, number> {
  return {
    drawdownRate: -0.24,
    drawdownSpeed: -0.1,
    atrPct: 3.8,
    volumeShock: 2.1,
    regime200: 1,
    gapDownFreq: 3,
    zScore: -2.4,
    rsi: 23,
    crsi: 19,
    low52w: 1,
    breadth: 35,
    ...overrides,
  };
}

export function buildCrashEvent(input: {
  index: number;
  date: string;
  crashScore: number;
  severity?: number;
  metrics?: Partial<Record<CrashFeatureKey, number>>;
}): CrashEvent {
  return {
    index: input.index,
    date: input.date,
    crashScore: input.crashScore,
    severity: input.severity ?? input.crashScore,
    signals: {},
    metrics: input.metrics ?? buildFullMetrics(),
    symbol: "^N225",
  };
}

export function toIndicatorPointsFromCandles(candles: Candle[]): IndicatorPoint[] {
  return candles.map((candle, index) => ({
    ...candle,
    dayReturnPct: index === 0 ? null : ((candle.close - candles[index - 1].close) / candles[index - 1].close) * 100,
    zScore: -1.1,
    rsi: 36,
    crsi: 28,
    drawdownRate: -0.1,
    drawdownSpeed5: -0.03,
    drawdownSpeed10: -0.06,
    drawdownSpeed: -0.06,
    atr: 2,
    atrPct: 2.1,
    volumeShock: 1.5,
    sma200: candle.close * 0.98,
    slope200: 0.12,
    below200: false,
    regime200: 0,
    gapDownPct: -0.2,
    gapDownFreq: 1.2,
    is52wLow: false,
    breadth: 52,
  }));
}
