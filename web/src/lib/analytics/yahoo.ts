import type { Candle } from "./types";

type YahooChartResult = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
  meta?: {
    currency?: string;
    exchangeName?: string;
    symbol?: string;
    timezone?: string;
  };
};

function toUnix(date: string): number | null {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return null;
  return Math.floor(parsed / 1000);
}

function toDateString(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

export async function fetchYahooCandles(input: {
  symbol: string;
  range?: string;
  from?: string;
  to?: string;
}): Promise<{
  candles: Candle[];
  meta: Record<string, string | undefined>;
}> {
  const symbol = input.symbol.trim();
  const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

  const params = new URLSearchParams();
  params.set("interval", "1d");
  params.set("includePrePost", "false");

  const fromUnix = input.from ? toUnix(input.from) : null;
  const toUnixValue = input.to ? toUnix(input.to) : null;

  if (fromUnix != null && toUnixValue != null) {
    params.set("period1", String(fromUnix));
    params.set("period2", String(toUnixValue));
  } else {
    params.set("range", input.range ?? "max");
  }

  const url = `${baseUrl}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    chart?: {
      error?: { code?: string; description?: string } | null;
      result?: YahooChartResult[];
    };
  };

  const chart = payload.chart;
  if (!chart) {
    throw new Error("Yahoo API malformed response: missing chart");
  }

  if (chart.error) {
    throw new Error(
      `Yahoo API error: ${chart.error.code ?? "UNKNOWN"} ${chart.error.description ?? ""}`,
    );
  }

  const result = chart.result?.[0];
  if (!result) {
    throw new Error("Yahoo API returned no chart result");
  }

  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp ?? [];

  const open = quote?.open ?? [];
  const high = quote?.high ?? [];
  const low = quote?.low ?? [];
  const close = quote?.close ?? [];
  const volume = quote?.volume ?? [];

  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const o = open[i];
    const h = high[i];
    const l = low[i];
    const c = close[i];

    if (
      o == null ||
      h == null ||
      l == null ||
      c == null ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c)
    ) {
      continue;
    }

    candles.push({
      date: toDateString(timestamps[i]),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: volume[i] != null && Number.isFinite(volume[i]) ? (volume[i] as number) : 0,
    });
  }

  return {
    candles,
    meta: {
      symbol: result.meta?.symbol,
      currency: result.meta?.currency,
      exchangeName: result.meta?.exchangeName,
      timezone: result.meta?.timezone,
    },
  };
}
