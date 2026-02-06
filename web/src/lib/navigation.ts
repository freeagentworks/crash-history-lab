import type { IndicatorParams } from "./analytics/types";

type DetectionMode = "score" | "single";

export type EventDetailContext = {
  range: string;
  mode: DetectionMode;
  threshold: number;
  coolingDays: number;
  preDays: number;
  postDays: number;
  params?: Partial<IndicatorParams>;
};

const defaultContext: EventDetailContext = {
  range: "10y",
  mode: "score",
  threshold: 70,
  coolingDays: 10,
  preDays: 10,
  postDays: 50,
};

function safeNumber(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeMode(value: string | undefined): DetectionMode {
  return value === "single" ? "single" : "score";
}

export function buildEventDetailHref(input: {
  symbol: string;
  date: string;
  context: EventDetailContext;
}): string {
  const query = new URLSearchParams();
  query.set("range", input.context.range);
  query.set("mode", input.context.mode);
  query.set("threshold", String(input.context.threshold));
  query.set("coolingDays", String(input.context.coolingDays));
  query.set("preDays", String(input.context.preDays));
  query.set("postDays", String(input.context.postDays));
  if (input.context.params) {
    query.set("params", JSON.stringify(input.context.params));
  }

  return `/events/${encodeURIComponent(input.symbol)}/${input.date}?${query.toString()}`;
}

export function buildEventsListHref(input: {
  symbol: string;
  context: EventDetailContext;
}): string {
  const query = new URLSearchParams();
  query.set("symbol", input.symbol);
  query.set("range", input.context.range);
  query.set("mode", input.context.mode);
  query.set("threshold", String(input.context.threshold));
  query.set("coolingDays", String(input.context.coolingDays));
  query.set("preDays", String(input.context.preDays));
  query.set("postDays", String(input.context.postDays));
  if (input.context.params) {
    query.set("params", JSON.stringify(input.context.params));
  }

  return `/events?${query.toString()}`;
}

export function parseEventDetailContext(
  searchParams: Record<string, string | string[] | undefined>,
): EventDetailContext {
  const rawRange = searchParams.range;
  const rawMode = searchParams.mode;
  const rawThreshold = searchParams.threshold;
  const rawCoolingDays = searchParams.coolingDays;
  const rawPreDays = searchParams.preDays;
  const rawPostDays = searchParams.postDays;
  const rawParams = searchParams.params;

  const paramsValue = Array.isArray(rawParams) ? rawParams[0] : rawParams;
  let params: Partial<IndicatorParams> | undefined;

  if (paramsValue) {
    try {
      const parsed = JSON.parse(paramsValue) as Partial<IndicatorParams>;
      if (parsed && typeof parsed === "object") {
        params = parsed;
      }
    } catch {
      params = undefined;
    }
  }

  return {
    range: Array.isArray(rawRange) ? rawRange[0] ?? defaultContext.range : rawRange ?? defaultContext.range,
    mode: sanitizeMode(Array.isArray(rawMode) ? rawMode[0] : rawMode),
    threshold: safeNumber(Array.isArray(rawThreshold) ? rawThreshold[0] : rawThreshold, defaultContext.threshold),
    coolingDays: safeNumber(
      Array.isArray(rawCoolingDays) ? rawCoolingDays[0] : rawCoolingDays,
      defaultContext.coolingDays,
    ),
    preDays: safeNumber(Array.isArray(rawPreDays) ? rawPreDays[0] : rawPreDays, defaultContext.preDays),
    postDays: safeNumber(Array.isArray(rawPostDays) ? rawPostDays[0] : rawPostDays, defaultContext.postDays),
    params,
  };
}
