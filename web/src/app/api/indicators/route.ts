import { NextResponse } from "next/server";
import { computeIndicators } from "../../../lib/analytics/indicators";
import type { Candle, IndicatorParams } from "../../../lib/analytics/types";

type IndicatorsRequest = {
  symbol?: string;
  candles?: Candle[];
  params?: Partial<IndicatorParams>;
};

function isValidCandle(candle: Candle): boolean {
  return (
    typeof candle.date === "string" &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    Number.isFinite(candle.volume)
  );
}

export async function POST(request: Request) {
  let body: IndicatorsRequest;

  try {
    body = (await request.json()) as IndicatorsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const candles = body.candles ?? [];
  if (!Array.isArray(candles) || candles.length === 0) {
    return NextResponse.json(
      { error: "Body must include non-empty candles array." },
      { status: 400 },
    );
  }

  if (!candles.every(isValidCandle)) {
    return NextResponse.json(
      { error: "One or more candles are invalid." },
      { status: 400 },
    );
  }

  const { points, params } = computeIndicators({
    candles,
    symbol: body.symbol,
    params: body.params,
  });

  return NextResponse.json({
    symbol: body.symbol,
    count: points.length,
    params,
    points,
  });
}
