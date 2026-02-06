import type { CrashScoreWeights, IndicatorParams } from "./types";

export const defaultIndicatorParams: IndicatorParams = {
  zScore: { window: 20 },
  rsi: { window: 14 },
  crsi: { rsiWindow: 3, streakWindow: 2, rankWindow: 100 },
  drawdown: { lookback: 252 },
  drawdownSpeed: { window1: 5, window2: 10 },
  atr: { window: 14 },
  volumeShock: { window: 20 },
  ma200: { window: 200, slopeLookback: 5 },
  gapDown: { window: 20, thresholdPct: -2.0 },
  low52w: { window: 252 },
  breadth: { window: 20 },
};

export const defaultCrashScoreWeights: CrashScoreWeights = {
  drawdownRate: 0.18,
  drawdownSpeed: 0.14,
  atrPct: 0.11,
  volumeShock: 0.09,
  regime200: 0.1,
  gapDownFreq: 0.08,
  zScore: 0.07,
  rsi: 0.05,
  crsi: 0.05,
  low52w: 0.05,
  breadth: 0.08,
};

export const defaultSingleRule = {
  feature: "drawdownRate" as const,
  operator: "<=" as const,
  value: -0.15,
};

export const defaultScoreThreshold = 70;
export const defaultCoolingDays = 10;

export function mergeIndicatorParams(
  partial?: Partial<IndicatorParams>,
): IndicatorParams {
  return {
    zScore: {
      window: partial?.zScore?.window ?? defaultIndicatorParams.zScore.window,
    },
    rsi: { window: partial?.rsi?.window ?? defaultIndicatorParams.rsi.window },
    crsi: {
      rsiWindow:
        partial?.crsi?.rsiWindow ?? defaultIndicatorParams.crsi.rsiWindow,
      streakWindow:
        partial?.crsi?.streakWindow ?? defaultIndicatorParams.crsi.streakWindow,
      rankWindow:
        partial?.crsi?.rankWindow ?? defaultIndicatorParams.crsi.rankWindow,
    },
    drawdown: {
      lookback:
        partial?.drawdown?.lookback ?? defaultIndicatorParams.drawdown.lookback,
    },
    drawdownSpeed: {
      window1:
        partial?.drawdownSpeed?.window1 ??
        defaultIndicatorParams.drawdownSpeed.window1,
      window2:
        partial?.drawdownSpeed?.window2 ??
        defaultIndicatorParams.drawdownSpeed.window2,
    },
    atr: { window: partial?.atr?.window ?? defaultIndicatorParams.atr.window },
    volumeShock: {
      window:
        partial?.volumeShock?.window ?? defaultIndicatorParams.volumeShock.window,
    },
    ma200: {
      window: partial?.ma200?.window ?? defaultIndicatorParams.ma200.window,
      slopeLookback:
        partial?.ma200?.slopeLookback ??
        defaultIndicatorParams.ma200.slopeLookback,
    },
    gapDown: {
      window: partial?.gapDown?.window ?? defaultIndicatorParams.gapDown.window,
      thresholdPct:
        partial?.gapDown?.thresholdPct ??
        defaultIndicatorParams.gapDown.thresholdPct,
    },
    low52w: {
      window: partial?.low52w?.window ?? defaultIndicatorParams.low52w.window,
    },
    breadth: {
      window: partial?.breadth?.window ?? defaultIndicatorParams.breadth.window,
    },
  };
}

export function mergeCrashWeights(
  partial?: Partial<CrashScoreWeights>,
): CrashScoreWeights {
  return {
    ...defaultCrashScoreWeights,
    ...partial,
  };
}
