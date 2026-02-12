import { NextResponse } from "next/server";
import { runBacktest } from "../../../lib/analytics/backtest";
import type { BacktestTemplateId } from "../../../lib/analytics/backtest";
import { detectCrashEvents } from "../../../lib/analytics/crash-detection";
import { computeIndicators } from "../../../lib/analytics/indicators";
import type {
  Candle,
  CrashDetectionOptions,
  DetectionMode,
  IndicatorParams,
  SingleRule,
} from "../../../lib/analytics/types";
import { fetchYahooCandles } from "../../../lib/analytics/yahoo";

type BacktestRequest = {
  symbol: string;
  templateId: BacktestTemplateId;
  range?: string;
  mode?: DetectionMode;
  threshold?: number;
  coolingDays?: number;
  singleRule?: SingleRule;
  candles?: Candle[];
  params?: Partial<IndicatorParams>;
  backtestParams?: {
    entryThreshold?: number;
    rsiMax?: number;
    takeProfitPct?: number;
    stopLossPct?: number;
    maxHoldDays?: number;
    armWindowDays?: number;
    applyCosts?: boolean;
    costPct?: number;
    slippagePct?: number;
  };
};

export async function POST(request: Request) {
  let body: BacktestRequest;

  try {
    body = (await request.json()) as BacktestRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const symbol = body.symbol?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required." }, { status: 400 });
  }

  if (!body.templateId) {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  try {
    let candles = body.candles;
    if (!candles || candles.length === 0) {
      const market = await fetchYahooCandles({ symbol, range: body.range ?? "5y" });
      candles = market.candles;
    }

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

    const backtest = runBacktest({
      templateId: body.templateId,
      scoredPoints: detection.scoredPoints,
      events: detection.events,
      params: body.backtestParams,
    });

    return NextResponse.json({
      symbol,
      templateId: body.templateId,
      eventCount: detection.events.length,
      summary: backtest.summary,
      equityCurve: backtest.equityCurve,
      trades: backtest.trades,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to run backtest.", detail },
      { status: 500 },
    );
  }
}
