import {
  defaultCoolingDays,
  defaultScoreThreshold,
  defaultSingleRule,
  mergeCrashWeights,
} from "./config";
import { robustScale } from "./math";
import type {
  CrashDetectionOptions,
  CrashEvent,
  CrashFeatureKey,
  CrashScoreWeights,
  IndicatorPoint,
  SingleRule,
} from "./types";

type FeatureDirection = "high-is-bad" | "low-is-bad";

type FeatureSpec = {
  key: CrashFeatureKey;
  direction: FeatureDirection;
  getter: (point: IndicatorPoint) => number | null;
  discrete?: boolean;
};

const featureSpecs: FeatureSpec[] = [
  {
    key: "zScore",
    direction: "low-is-bad",
    getter: (point) => point.zScore,
  },
  {
    key: "rsi",
    direction: "low-is-bad",
    getter: (point) => point.rsi,
  },
  {
    key: "crsi",
    direction: "low-is-bad",
    getter: (point) => point.crsi,
  },
  {
    key: "drawdownRate",
    direction: "low-is-bad",
    getter: (point) => point.drawdownRate,
  },
  {
    key: "drawdownSpeed",
    direction: "low-is-bad",
    getter: (point) => point.drawdownSpeed,
  },
  {
    key: "atrPct",
    direction: "high-is-bad",
    getter: (point) => point.atrPct,
  },
  {
    key: "volumeShock",
    direction: "high-is-bad",
    getter: (point) => point.volumeShock,
  },
  {
    key: "regime200",
    direction: "high-is-bad",
    getter: (point) => point.regime200,
    discrete: true,
  },
  {
    key: "gapDownFreq",
    direction: "high-is-bad",
    getter: (point) => point.gapDownFreq,
  },
  {
    key: "low52w",
    direction: "high-is-bad",
    getter: (point) => {
      if (point.is52wLow == null) return null;
      return point.is52wLow ? 1 : 0;
    },
    discrete: true,
  },
  {
    key: "breadth",
    direction: "low-is-bad",
    getter: (point) => point.breadth,
  },
];

export type ScoredPoint = IndicatorPoint & {
  crashScore: number | null;
  signals: Partial<Record<CrashFeatureKey, number>>;
};

export type CrashDetectionResult = {
  scoredPoints: ScoredPoint[];
  events: CrashEvent[];
  ranking: CrashEvent[];
};

function getSeries(points: IndicatorPoint[], spec: FeatureSpec): number[] {
  return points
    .map((point) => spec.getter(point))
    .filter((value): value is number => value != null && Number.isFinite(value));
}

function resolveSingleRule(
  rule?: SingleRule,
): SingleRule {
  return rule ?? defaultSingleRule;
}

function evaluateRule(value: number, rule: SingleRule): boolean {
  switch (rule.operator) {
    case "<":
      return value < rule.value;
    case "<=":
      return value <= rule.value;
    case ">":
      return value > rule.value;
    case ">=":
      return value >= rule.value;
    default:
      return false;
  }
}

function computeDiscreteSignal(value: number): number {
  return Math.max(0, Math.min(100, value * 100));
}

function computeScores(
  points: IndicatorPoint[],
  weights: CrashScoreWeights,
): ScoredPoint[] {
  const baselines = new Map<CrashFeatureKey, number[]>();
  for (const spec of featureSpecs) {
    baselines.set(spec.key, getSeries(points, spec));
  }

  return points.map((point) => {
    const signals: Partial<Record<CrashFeatureKey, number>> = {};

    for (const spec of featureSpecs) {
      const raw = spec.getter(point);
      if (raw == null || !Number.isFinite(raw)) continue;

      if (spec.discrete) {
        signals[spec.key] = computeDiscreteSignal(raw);
        continue;
      }

      const series = baselines.get(spec.key) ?? [];
      if (series.length < 8) continue;
      signals[spec.key] = robustScale(raw, series, spec.direction);
    }

    let weightedSum = 0;
    let weightSum = 0;

    for (const [feature, signal] of Object.entries(signals) as Array<[
      CrashFeatureKey,
      number,
    ]>) {
      const w = weights[feature];
      if (!Number.isFinite(w) || w <= 0) continue;
      weightedSum += w * signal;
      weightSum += w;
    }

    const crashScore = weightSum > 0 ? weightedSum / weightSum : null;

    return {
      ...point,
      crashScore,
      signals,
    };
  });
}

function featureValue(point: IndicatorPoint, key: CrashFeatureKey): number | null {
  switch (key) {
    case "zScore":
      return point.zScore;
    case "rsi":
      return point.rsi;
    case "crsi":
      return point.crsi;
    case "drawdownRate":
      return point.drawdownRate;
    case "drawdownSpeed":
      return point.drawdownSpeed;
    case "atrPct":
      return point.atrPct;
    case "volumeShock":
      return point.volumeShock;
    case "regime200":
      return point.regime200;
    case "gapDownFreq":
      return point.gapDownFreq;
    case "low52w":
      if (point.is52wLow == null) return null;
      return point.is52wLow ? 1 : 0;
    case "breadth":
      return point.breadth;
    default:
      return null;
  }
}

function extractMetrics(point: IndicatorPoint): Partial<Record<CrashFeatureKey, number>> {
  const metrics: Partial<Record<CrashFeatureKey, number>> = {};

  for (const spec of featureSpecs) {
    const value = featureValue(point, spec.key);
    if (value == null || !Number.isFinite(value)) continue;
    metrics[spec.key] = value;
  }

  return metrics;
}

function collapseNearbyEvents(events: CrashEvent[], coolingDays: number): CrashEvent[] {
  if (events.length === 0) return [];

  const collapsed: CrashEvent[] = [events[0]];

  for (let i = 1; i < events.length; i += 1) {
    const current = events[i];
    const last = collapsed[collapsed.length - 1];

    if (current.index - last.index > coolingDays) {
      collapsed.push(current);
      continue;
    }

    if (current.severity > last.severity) {
      collapsed[collapsed.length - 1] = current;
    }
  }

  return collapsed;
}

export function detectCrashEvents(
  points: IndicatorPoint[],
  options: CrashDetectionOptions,
): CrashDetectionResult {
  const weights = mergeCrashWeights(options.weights);
  const scoredPoints = computeScores(points, weights);
  const mode = options.mode;
  const threshold = options.threshold ?? defaultScoreThreshold;
  const coolingDays = options.coolingDays ?? defaultCoolingDays;
  const rule = resolveSingleRule(options.singleRule);

  const candidates: CrashEvent[] = [];

  scoredPoints.forEach((point, index) => {
    if (mode === "score") {
      if (point.crashScore == null) return;
      if (point.crashScore < threshold) return;

      candidates.push({
        index,
        symbol: options.symbol,
        date: point.date,
        crashScore: point.crashScore,
        severity: point.crashScore,
        signals: point.signals,
        metrics: extractMetrics(point),
      });
      return;
    }

    const rawValue = featureValue(point, rule.feature);
    if (rawValue == null || !Number.isFinite(rawValue)) return;
    if (!evaluateRule(rawValue, rule)) return;

    const severity = Math.abs(rawValue - rule.value) * 100;

    candidates.push({
      index,
      symbol: options.symbol,
      date: point.date,
      crashScore: point.crashScore,
      severity,
      signals: point.signals,
      metrics: {
        [rule.feature]: rawValue,
      },
    });
  });

  const collapsed = collapseNearbyEvents(candidates, coolingDays);
  const ranking = [...collapsed].sort((a, b) => b.severity - a.severity);

  return {
    scoredPoints,
    events: collapsed,
    ranking,
  };
}
