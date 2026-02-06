import type { Candle, CrashEvent, CrashFeatureKey } from "./types";

type SimilarityReason = {
  feature: CrashFeatureKey | "pricePath";
  note: string;
};

export type SimilarMatch = {
  date: string;
  similarityScore: number;
  combinedDistance: number;
  featureDistance: number;
  dtwDistance: number;
  reasons: SimilarityReason[];
  metrics: CrashEvent["metrics"];
};

export type SimilarityResult = {
  targetDate: string;
  matches: SimilarMatch[];
};

type FeatureVector = {
  date: string;
  vector: number[];
  metrics: CrashEvent["metrics"];
};

const orderedFeatures: Array<CrashFeatureKey> = [
  "drawdownRate",
  "drawdownSpeed",
  "atrPct",
  "volumeShock",
  "regime200",
  "gapDownFreq",
  "zScore",
  "rsi",
  "crsi",
  "low52w",
  "breadth",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWindow(values: number[]): number[] {
  if (values.length === 0) return values;
  const base = values[0] || 1;
  return values.map((value) => value / base);
}

function dtwDistance(seriesA: number[], seriesB: number[]): number {
  if (seriesA.length === 0 || seriesB.length === 0) return Number.POSITIVE_INFINITY;

  const n = seriesA.length;
  const m = seriesB.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(Number.POSITIVE_INFINITY),
  );
  dp[0][0] = 0;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = Math.abs(seriesA[i - 1] - seriesB[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / (n + m);
}

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA <= 1e-12 || normB <= 1e-12) return 1;
  const cosine = dot / Math.sqrt(normA * normB);
  return 1 - clamp(cosine, -1, 1);
}

function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span <= 1e-12) return values.map(() => 0.5);
  return values.map((value) => (value - min) / span);
}

function standardize(vectors: number[][]): number[][] {
  if (vectors.length === 0) return vectors;
  const dim = vectors[0].length;
  const means = Array<number>(dim).fill(0);
  const stds = Array<number>(dim).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dim; i += 1) {
      means[i] += vector[i];
    }
  }

  for (let i = 0; i < dim; i += 1) {
    means[i] /= vectors.length;
  }

  for (const vector of vectors) {
    for (let i = 0; i < dim; i += 1) {
      const d = vector[i] - means[i];
      stds[i] += d * d;
    }
  }

  for (let i = 0; i < dim; i += 1) {
    stds[i] = Math.sqrt(stds[i] / Math.max(vectors.length - 1, 1));
    if (stds[i] <= 1e-9) stds[i] = 1;
  }

  return vectors.map((vector) =>
    vector.map((value, i) => (value - means[i]) / stds[i]),
  );
}

function pickWindow(candles: Candle[], eventIndex: number, preDays: number, postDays: number): number[] {
  const start = Math.max(0, eventIndex - preDays);
  const end = Math.min(candles.length - 1, eventIndex + postDays);
  const closes = candles.slice(start, end + 1).map((candle) => candle.close);
  return normalizeWindow(closes);
}

function buildFeatureVector(event: CrashEvent): FeatureVector | null {
  const values: number[] = [];

  for (const feature of orderedFeatures) {
    const raw = event.metrics[feature];
    if (raw == null || !Number.isFinite(raw)) return null;
    values.push(raw);
  }

  values.push(event.crashScore ?? 0);

  return {
    date: event.date,
    vector: values,
    metrics: event.metrics,
  };
}

function topReasons(
  targetVector: number[],
  candidateVector: number[],
  dtwDist: number,
): SimilarityReason[] {
  const diffs = orderedFeatures.map((feature, idx) => ({
    feature,
    diff: Math.abs(targetVector[idx] - candidateVector[idx]),
  }));

  diffs.sort((a, b) => a.diff - b.diff);

  const reasons: SimilarityReason[] = diffs.slice(0, 2).map((item) => ({
    feature: item.feature,
    note: `${item.feature}の差分が小さい`,
  }));

  reasons.push({
    feature: "pricePath",
    note: `価格パスDTW距離=${dtwDist.toFixed(4)}`,
  });

  return reasons;
}

export function findSimilarEvents(input: {
  candles: Candle[];
  events: CrashEvent[];
  targetDate: string;
  topN?: number;
  preDays?: number;
  postDays?: number;
}): SimilarityResult {
  const topN = input.topN ?? 5;
  const preDays = input.preDays ?? 10;
  const postDays = input.postDays ?? 50;

  const candleIndexMap = new Map<string, number>();
  input.candles.forEach((candle, idx) => {
    candleIndexMap.set(candle.date, idx);
  });

  const targetEvent = input.events.find((event) => event.date === input.targetDate);
  if (!targetEvent) {
    return {
      targetDate: input.targetDate,
      matches: [],
    };
  }

  const vectorPairs = input.events
    .map((event) => buildFeatureVector(event))
    .filter((item): item is FeatureVector => item != null);

  const vectorMap = new Map<string, FeatureVector>();
  vectorPairs.forEach((pair) => vectorMap.set(pair.date, pair));

  const validVectors = vectorPairs.map((item) => item.vector);
  const standardized = standardize(validVectors);
  const standardizedMap = new Map<string, number[]>();
  vectorPairs.forEach((pair, idx) => {
    standardizedMap.set(pair.date, standardized[idx]);
  });

  const targetVector = standardizedMap.get(targetEvent.date);
  const targetIdx = candleIndexMap.get(targetEvent.date);

  if (!targetVector || targetIdx == null) {
    return {
      targetDate: input.targetDate,
      matches: [],
    };
  }

  const targetWindow = pickWindow(input.candles, targetIdx, preDays, postDays);

  const raw = input.events
    .filter((event) => event.date !== targetEvent.date)
    .map((event) => {
      const candidateVec = standardizedMap.get(event.date);
      const candidateIdx = candleIndexMap.get(event.date);
      if (!candidateVec || candidateIdx == null) return null;

      const candidateWindow = pickWindow(input.candles, candidateIdx, preDays, postDays);
      const fCos = cosineDistance(targetVector, candidateVec);
      const fEuc = euclideanDistance(targetVector, candidateVec) / Math.sqrt(targetVector.length);
      const featureDistance = 0.6 * fCos + 0.4 * fEuc;
      const dtw = dtwDistance(targetWindow, candidateWindow);

      return {
        event,
        candidateVec,
        featureDistance,
        dtwDistance: dtw,
      };
    })
    .filter(
      (
        item,
      ): item is {
        event: CrashEvent;
        candidateVec: number[];
        featureDistance: number;
        dtwDistance: number;
      } => item != null && Number.isFinite(item.dtwDistance),
    );

  if (raw.length === 0) {
    return {
      targetDate: input.targetDate,
      matches: [],
    };
  }

  const featureNorm = minMaxNormalize(raw.map((item) => item.featureDistance));
  const dtwNorm = minMaxNormalize(raw.map((item) => item.dtwDistance));

  const matches: SimilarMatch[] = raw.map((item, idx) => {
    const combinedDistance = 0.65 * featureNorm[idx] + 0.35 * dtwNorm[idx];
    const similarityScore = clamp((1 - combinedDistance) * 100, 0, 100);

    return {
      date: item.event.date,
      similarityScore,
      combinedDistance,
      featureDistance: item.featureDistance,
      dtwDistance: item.dtwDistance,
      reasons: topReasons(targetVector, item.candidateVec, item.dtwDistance),
      metrics: item.event.metrics,
    };
  });

  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    targetDate: input.targetDate,
    matches: matches.slice(0, topN),
  };
}
