import { NextResponse } from "next/server";
import { detectCrashEvents } from "../../../lib/analytics/crash-detection";
import { defaultCoolingDays, defaultScoreThreshold } from "../../../lib/analytics/config";
import { computeIndicators } from "../../../lib/analytics/indicators";
import type {
  Candle,
  CrashDetectionOptions,
  CrashScoreWeights,
  DetectionMode,
  IndicatorParams,
  IndicatorPoint,
  SingleRule,
} from "../../../lib/analytics/types";

type CrashEventsRequest = {
  symbol?: string;
  mode?: DetectionMode;
  threshold?: number;
  coolingDays?: number;
  singleRule?: SingleRule;
  weights?: Partial<CrashScoreWeights>;
  candles?: Candle[];
  points?: IndicatorPoint[];
  params?: Partial<IndicatorParams>;
};

export async function POST(request: Request) {
  let body: CrashEventsRequest;

  try {
    body = (await request.json()) as CrashEventsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode ?? "score";

  let points = body.points;
  if (!points || points.length === 0) {
    const candles = body.candles ?? [];
    if (candles.length === 0) {
      return NextResponse.json(
        { error: "Provide either points[] or candles[] in request body." },
        { status: 400 },
      );
    }

    const indicatorResult = computeIndicators({
      candles,
      symbol: body.symbol,
      params: body.params,
    });
    points = indicatorResult.points;
  }

  const options: CrashDetectionOptions = {
    mode,
    threshold: body.threshold ?? defaultScoreThreshold,
    coolingDays: body.coolingDays ?? defaultCoolingDays,
    symbol: body.symbol,
    singleRule: body.singleRule,
    weights: body.weights,
  };

  const result = detectCrashEvents(points, options);

  return NextResponse.json({
    mode,
    threshold: options.threshold,
    coolingDays: options.coolingDays,
    count: result.events.length,
    events: result.events,
    ranking: result.ranking,
  });
}
