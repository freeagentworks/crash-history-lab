import { NextRequest, NextResponse } from "next/server";
import { fetchYahooCandles } from "../../../lib/analytics/yahoo";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  const range = request.nextUrl.searchParams.get("range")?.trim();
  const from = request.nextUrl.searchParams.get("from")?.trim();
  const to = request.nextUrl.searchParams.get("to")?.trim();

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 },
    );
  }

  try {
    const { candles, meta } = await fetchYahooCandles({ symbol, range, from, to });

    return NextResponse.json({
      symbol,
      range: range ?? "max",
      count: candles.length,
      meta,
      candles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch market data.", detail: message },
      { status: 502 },
    );
  }
}
