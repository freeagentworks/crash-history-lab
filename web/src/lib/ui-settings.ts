import { defaultIndicatorParams } from "./analytics/config";
import type { IndicatorParams } from "./analytics/types";

export const UI_SETTINGS_KEY = "crash-history-lab.settings.v1";

export type UiSettings = {
  defaultRange: string;
  preDays: number;
  postDays: number;
  defaultMode: "score" | "single";
  threshold: number;
  coolingDays: number;
  indicators: IndicatorParams;
};

export const defaultUiSettings: UiSettings = {
  defaultRange: "10y",
  preDays: 10,
  postDays: 50,
  defaultMode: "score",
  threshold: 70,
  coolingDays: 10,
  indicators: defaultIndicatorParams,
};

function safeNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function mergeUiSettings(partial: Partial<UiSettings> = {}): UiSettings {
  const indicators: Partial<IndicatorParams> = partial.indicators ?? {};

  return {
    defaultRange: partial.defaultRange ?? defaultUiSettings.defaultRange,
    preDays: safeNumber(partial.preDays, defaultUiSettings.preDays),
    postDays: safeNumber(partial.postDays, defaultUiSettings.postDays),
    defaultMode: partial.defaultMode ?? defaultUiSettings.defaultMode,
    threshold: safeNumber(partial.threshold, defaultUiSettings.threshold),
    coolingDays: safeNumber(partial.coolingDays, defaultUiSettings.coolingDays),
    indicators: {
      ...defaultIndicatorParams,
      ...indicators,
      zScore: {
        ...defaultIndicatorParams.zScore,
        ...indicators.zScore,
      },
      rsi: {
        ...defaultIndicatorParams.rsi,
        ...indicators.rsi,
      },
      crsi: {
        ...defaultIndicatorParams.crsi,
        ...indicators.crsi,
      },
      drawdown: {
        ...defaultIndicatorParams.drawdown,
        ...indicators.drawdown,
      },
      drawdownSpeed: {
        ...defaultIndicatorParams.drawdownSpeed,
        ...indicators.drawdownSpeed,
      },
      atr: {
        ...defaultIndicatorParams.atr,
        ...indicators.atr,
      },
      volumeShock: {
        ...defaultIndicatorParams.volumeShock,
        ...indicators.volumeShock,
      },
      ma200: {
        ...defaultIndicatorParams.ma200,
        ...indicators.ma200,
      },
      gapDown: {
        ...defaultIndicatorParams.gapDown,
        ...indicators.gapDown,
      },
      low52w: {
        ...defaultIndicatorParams.low52w,
        ...indicators.low52w,
      },
      breadth: {
        ...defaultIndicatorParams.breadth,
        ...indicators.breadth,
      },
    },
  };
}

export function readUiSettings(): UiSettings {
  if (typeof window === "undefined") {
    return defaultUiSettings;
  }

  try {
    const raw = window.localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return defaultUiSettings;

    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return mergeUiSettings(parsed);
  } catch {
    return defaultUiSettings;
  }
}

export function saveUiSettings(settings: UiSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings));
}
