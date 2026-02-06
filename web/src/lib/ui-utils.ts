import type { Candle } from "./analytics/types";

export function formatNumber(value: number | null | undefined, digit = 2): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(digit);
}

export function formatPct(value: number | null | undefined, digit = 1): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(digit)}%`;
}

export function percentIfRatio(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) <= 1.5) return value * 100;
  return value;
}

export function buildLinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";

  const padding = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((value - min) / span) * (height - padding * 2);
      const cmd = index === 0 ? "M" : "L";
      return `${cmd}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export type ValueBounds = {
  min: number;
  max: number;
};

export type CandlestickGlyph = {
  date: string;
  x: number;
  wickTopY: number;
  wickBottomY: number;
  bodyTopY: number;
  bodyHeight: number;
  isUp: boolean;
};

function toBounds(values: number[]): ValueBounds | null {
  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function indexToPlotX(index: number, length: number, width: number, padding = 14): number {
  if (length <= 1) return width / 2;
  return padding + (index / (length - 1)) * (width - padding * 2);
}

export function resolveCandlestickBodyWidth(length: number, width: number, padding = 14): number {
  if (length <= 0) return 4;
  const innerWidth = width - padding * 2;
  return Math.max(2, Math.min(10, (innerWidth / length) * 0.58));
}

export function computePriceBounds(
  candles: Candle[],
  overlays: Array<number | null> = [],
): ValueBounds | null {
  if (candles.length === 0) return null;

  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const overlayValues = overlays.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );

  const rawBounds = toBounds([...highs, ...lows, ...overlayValues]);
  if (!rawBounds) return null;

  if (rawBounds.max === rawBounds.min) {
    return {
      min: rawBounds.min - 1,
      max: rawBounds.max + 1,
    };
  }

  return rawBounds;
}

export function buildCandlestickGlyphs(
  candles: Candle[],
  width: number,
  height: number,
  bounds: ValueBounds,
  padding = 14,
): CandlestickGlyph[] {
  if (candles.length === 0) return [];

  const span = bounds.max - bounds.min || 1;
  const yOf = (value: number): number =>
    height - padding - ((value - bounds.min) / span) * (height - padding * 2);

  return candles.map((candle, index) => {
    const openY = yOf(candle.open);
    const closeY = yOf(candle.close);

    return {
      date: candle.date,
      x: indexToPlotX(index, candles.length, width, padding),
      wickTopY: yOf(candle.high),
      wickBottomY: yOf(candle.low),
      bodyTopY: Math.min(openY, closeY),
      bodyHeight: Math.max(1, Math.abs(closeY - openY)),
      isUp: candle.close >= candle.open,
    };
  });
}

export function buildPathFromNullable(
  values: Array<number | null>,
  width: number,
  height: number,
  bounds?: { min: number; max: number },
): string {
  const valid = values
    .map((value, index) => (value == null || !Number.isFinite(value) ? null : { index, value }))
    .filter((point): point is { index: number; value: number } => point != null);

  if (valid.length === 0) return "";

  const padding = 10;
  const min = bounds?.min ?? Math.min(...valid.map((point) => point.value));
  const max = bounds?.max ?? Math.max(...valid.map((point) => point.value));
  const span = max - min || 1;

  return valid
    .map((point, idx) => {
      const x =
        padding +
        (point.index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.value - min) / span) * (height - padding * 2);

      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
