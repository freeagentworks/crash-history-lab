import { NextResponse } from "next/server";
import { detectCrashEvents } from "../../../lib/analytics/crash-detection";
import { computeIndicators } from "../../../lib/analytics/indicators";
import { findSimilarEvents } from "../../../lib/analytics/similarity";
import type {
  Candle,
  CrashDetectionOptions,
  CrashEvent,
  DetectionMode,
  IndicatorParams,
  SingleRule,
} from "../../../lib/analytics/types";
import { fetchYahooCandles } from "../../../lib/analytics/yahoo";

type SimilarEventsRequest = {
  symbol: string;
  targetDate: string;
  topN?: number;
  preDays?: number;
  postDays?: number;
  range?: string;
  mode?: DetectionMode;
  threshold?: number;
  coolingDays?: number;
  singleRule?: SingleRule;
  candles?: Candle[];
  events?: CrashEvent[];
  params?: Partial<IndicatorParams>;
};

export async function POST(request: Request) {
  let body: SimilarEventsRequest;

  try {
    body = (await request.json()) as SimilarEventsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const symbol = body.symbol?.trim();
  const targetDate = body.targetDate?.trim();

  if (!symbol || !targetDate) {
    return NextResponse.json(
      { error: "symbol and targetDate are required." },
      { status: 400 },
    );
  }

  try {
    let candles = body.candles;
    if (!candles || candles.length === 0) {
      const market = await fetchYahooCandles({ symbol, range: body.range ?? "10y" });
      candles = market.candles;
    }

    let events = body.events;
    if (!events || events.length === 0) {
      const indicators = computeIndicators({
        candles,
        symbol,
        params: body.params,
      });

      const options: CrashDetectionOptions = {
        mode: body.mode ?? "score",
        threshold: body.threshold ?? 70,
        coolingDays: body.coolingDays ?? 10,
        symbol,
        singleRule: body.singleRule,
      };

      const detection = detectCrashEvents(indicators.points, options);
      events = detection.events;
    }

    const result = findSimilarEvents({
      candles,
      events,
      targetDate,
      topN: body.topN ?? 5,
      preDays: body.preDays ?? 10,
      postDays: body.postDays ?? 50,
    });

    return NextResponse.json({
      symbol,
      targetDate,
      count: result.matches.length,
      matches: result.matches,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to calculate similar events.", detail },
      { status: 500 },
    );
  }
}
