import { mergeIndicatorParams } from "./config";
import {
  computeAtr,
  computePercentRank,
  computeRsi,
  computeStreak,
  rollingMax,
  rollingMin,
  rollingSma,
  rollingStdDev,
  rollingSum,
} from "./math";
import type { Candle, IndicatorParams, IndicatorPoint } from "./types";

function normalizeCandles(candles: Candle[]): Candle[] {
  return [...candles]
    .map((candle) => ({
      ...candle,
      date: candle.date.slice(0, 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isIndexLike(symbol?: string): boolean {
  if (!symbol) return false;
  return symbol.startsWith("^");
}

export function computeIndicators(input: {
  candles: Candle[];
  symbol?: string;
  params?: Partial<IndicatorParams>;
}): {
  points: IndicatorPoint[];
  params: IndicatorParams;
} {
  const candles = normalizeCandles(input.candles);
  const params = mergeIndicatorParams(input.params);

  if (candles.length === 0) {
    return { points: [], params };
  }

  const open = candles.map((c) => c.open);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const close = candles.map((c) => c.close);
  const volume = candles.map((c) => c.volume);

  const dayReturnPct: Array<number | null> = close.map((value, i) => {
    if (i === 0 || close[i - 1] === 0) return null;
    return ((value - close[i - 1]) / close[i - 1]) * 100;
  });

  const zMa = rollingSma(close, params.zScore.window);
  const zStd = rollingStdDev(close, params.zScore.window);
  const zScore: Array<number | null> = close.map((value, i) => {
    const ma = zMa[i];
    const std = zStd[i];
    if (ma == null || std == null || std === 0) return null;
    return (value - ma) / std;
  });

  const rsi = computeRsi(close, params.rsi.window);

  const streak = computeStreak(close);
  const streakRsi = computeRsi(streak, params.crsi.streakWindow);
  const shortRsi = computeRsi(close, params.crsi.rsiWindow);
  const dayReturnRaw = close.map((value, i) => {
    if (i === 0 || close[i - 1] === 0) return 0;
    return ((value - close[i - 1]) / close[i - 1]) * 100;
  });
  const rank = computePercentRank(dayReturnRaw, params.crsi.rankWindow);
  const crsi: Array<number | null> = close.map((_, i) => {
    const a = shortRsi[i];
    const b = streakRsi[i];
    const c = rank[i];
    if (a == null || b == null || c == null) return null;
    return (a + b + c) / 3;
  });

  const rollingMaxClose = rollingMax(close, params.drawdown.lookback);
  const drawdownRate: Array<number | null> = close.map((value, i) => {
    const top = rollingMaxClose[i];
    if (top == null || top === 0) return null;
    return value / top - 1;
  });

  const drawdownSpeed5: Array<number | null> = close.map((value, i) => {
    if (i < params.drawdownSpeed.window1 || close[i - params.drawdownSpeed.window1] === 0)
      return null;
    return value / close[i - params.drawdownSpeed.window1] - 1;
  });

  const drawdownSpeed10: Array<number | null> = close.map((value, i) => {
    if (i < params.drawdownSpeed.window2 || close[i - params.drawdownSpeed.window2] === 0)
      return null;
    return value / close[i - params.drawdownSpeed.window2] - 1;
  });

  const drawdownSpeed: Array<number | null> = close.map((_, i) => {
    const a = drawdownSpeed5[i];
    const b = drawdownSpeed10[i];
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return Math.min(a, b);
  });

  const atr = computeAtr(high, low, close, params.atr.window);
  const atrPct: Array<number | null> = close.map((value, i) => {
    const atrValue = atr[i];
    if (atrValue == null || value === 0) return null;
    return (atrValue / value) * 100;
  });

  const volSma = rollingSma(volume, params.volumeShock.window);
  const volumeShock: Array<number | null> = volume.map((value, i) => {
    const base = volSma[i];
    if (base == null || base === 0) return null;
    return value / base;
  });

  const sma200 = rollingSma(close, params.ma200.window);
  const below200: Array<boolean | null> = close.map((value, i) => {
    const ma = sma200[i];
    if (ma == null) return null;
    return value < ma;
  });

  const slope200: Array<number | null> = close.map((_, i) => {
    const now = sma200[i];
    const prev = sma200[i - params.ma200.slopeLookback];
    if (now == null || prev == null) return null;
    return now - prev;
  });

  const regime200: Array<number | null> = close.map((_, i) => {
    const below = below200[i];
    const slope = slope200[i];
    if (below == null || slope == null) return null;
    if (below && slope < 0) return 1;
    if (below || slope < 0) return 0.6;
    return 0;
  });

  const gapDownPct: Array<number | null> = open.map((value, i) => {
    if (i === 0 || close[i - 1] === 0) return null;
    return ((value - close[i - 1]) / close[i - 1]) * 100;
  });

  const gapDownFlag = gapDownPct.map((value) => {
    if (value == null) return null;
    return value <= params.gapDown.thresholdPct ? 1 : 0;
  });
  const gapDownFreq = rollingSum(gapDownFlag, params.gapDown.window);

  const rollingMinClose = rollingMin(close, params.low52w.window);
  const is52wLow: Array<boolean | null> = close.map((value, i) => {
    const floor = rollingMinClose[i];
    if (floor == null) return null;
    return value <= floor;
  });

  const breadth = isIndexLike(input.symbol)
    ? rollingSma(
        close.map((value, i) => {
          if (i === 0) return null;
          return value > close[i - 1] ? 1 : 0;
        }),
        params.breadth.window,
      ).map((value) => (value == null ? null : value * 100))
    : Array<number | null>(close.length).fill(null);

  const points: IndicatorPoint[] = candles.map((candle, i) => ({
    ...candle,
    dayReturnPct: dayReturnPct[i],
    zScore: zScore[i],
    rsi: rsi[i],
    crsi: crsi[i],
    drawdownRate: drawdownRate[i],
    drawdownSpeed5: drawdownSpeed5[i],
    drawdownSpeed10: drawdownSpeed10[i],
    drawdownSpeed: drawdownSpeed[i],
    atr: atr[i],
    atrPct: atrPct[i],
    volumeShock: volumeShock[i],
    sma200: sma200[i],
    slope200: slope200[i],
    below200: below200[i],
    regime200: regime200[i],
    gapDownPct: gapDownPct[i],
    gapDownFreq: gapDownFreq[i],
    is52wLow: is52wLow[i],
    breadth: breadth[i],
  }));

  return { points, params };
}
