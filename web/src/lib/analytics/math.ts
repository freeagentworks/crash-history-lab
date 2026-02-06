export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

export function rollingSma(
  values: Array<number | null>,
  window: number,
): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i += 1) {
    const slice = values.slice(i - window + 1, i + 1);
    if (slice.some((v) => v == null)) continue;
    out[i] = (slice as number[]).reduce((acc, v) => acc + v, 0) / window;
  }
  return out;
}

export function rollingStdDev(
  values: Array<number | null>,
  window: number,
): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i += 1) {
    const slice = values.slice(i - window + 1, i + 1);
    if (slice.some((v) => v == null)) continue;
    out[i] = stddev(slice as number[]);
  }
  return out;
}

export function rollingMax(values: number[], window: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i += 1) {
    let maxValue = -Infinity;
    for (let j = i - window + 1; j <= i; j += 1) {
      if (values[j] > maxValue) {
        maxValue = values[j];
      }
    }
    out[i] = maxValue;
  }
  return out;
}

export function rollingMin(values: number[], window: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i += 1) {
    let minValue = Infinity;
    for (let j = i - window + 1; j <= i; j += 1) {
      if (values[j] < minValue) {
        minValue = values[j];
      }
    }
    out[i] = minValue;
  }
  return out;
}

export function rollingSum(
  values: Array<number | null>,
  window: number,
): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i += 1) {
    const slice = values.slice(i - window + 1, i + 1);
    if (slice.some((v) => v == null)) continue;
    out[i] = (slice as number[]).reduce((acc, v) => acc + v, 0);
  }
  return out;
}

export function computeRsi(values: number[], window: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= window) return out;

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= window; i += 1) {
    const diff = values[i] - values[i - 1];
    gainSum += Math.max(diff, 0);
    lossSum += Math.max(-diff, 0);
  }

  let avgGain = gainSum / window;
  let avgLoss = lossSum / window;
  out[window] = rsiFromAverages(avgGain, avgLoss);

  for (let i = window + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    avgGain = (avgGain * (window - 1) + gain) / window;
    avgLoss = (avgLoss * (window - 1) + loss) / window;
    out[i] = rsiFromAverages(avgGain, avgLoss);
  }

  return out;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0 && avgGain === 0) return 50;
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeAtr(
  high: number[],
  low: number[],
  close: number[],
  window: number,
): Array<number | null> {
  const length = close.length;
  const tr: number[] = Array(length).fill(0);
  const out: Array<number | null> = Array(length).fill(null);

  for (let i = 0; i < length; i += 1) {
    if (i === 0) {
      tr[i] = high[i] - low[i];
      continue;
    }
    tr[i] = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1]),
    );
  }

  if (length < window) return out;

  let sum = 0;
  for (let i = 0; i < window; i += 1) {
    sum += tr[i];
  }

  out[window - 1] = sum / window;
  for (let i = window; i < length; i += 1) {
    out[i] = ((out[i - 1] as number) * (window - 1) + tr[i]) / window;
  }

  return out;
}

export function computeStreak(values: number[]): number[] {
  const out: number[] = Array(values.length).fill(0);

  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[i - 1]) {
      out[i] = out[i - 1] >= 0 ? out[i - 1] + 1 : 1;
    } else if (values[i] < values[i - 1]) {
      out[i] = out[i - 1] <= 0 ? out[i - 1] - 1 : -1;
    } else {
      out[i] = 0;
    }
  }

  return out;
}

export function computePercentRank(
  values: number[],
  window: number,
): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);

  for (let i = window; i < values.length; i += 1) {
    const current = values[i];
    const slice = values.slice(i - window, i);
    const lessOrEqualCount = slice.filter((v) => v <= current).length;
    out[i] = (lessOrEqualCount / window) * 100;
  }

  return out;
}

export function robustScale(
  value: number,
  series: number[],
  direction: "high-is-bad" | "low-is-bad",
): number {
  const med = median(series);
  const madValue = mad(series);
  const fallbackStd = stddev(series);
  const denom = madValue > 1e-9 ? madValue * 1.4826 : fallbackStd > 1e-9 ? fallbackStd : 1;

  let z = (value - med) / denom;
  if (direction === "low-is-bad") z *= -1;

  const clipped = clamp(z, -3.5, 3.5);
  return ((clipped + 3.5) / 7) * 100;
}
