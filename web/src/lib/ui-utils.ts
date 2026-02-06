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
