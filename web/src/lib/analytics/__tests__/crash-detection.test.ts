import { describe, expect, it } from "vitest";
import { detectCrashEvents } from "../crash-detection";
import { computeIndicators } from "../indicators";
import { buildIndicatorPoint, buildSyntheticCandles } from "./test-helpers";

describe("detectCrashEvents", () => {
  it("collapses nearby single-rule events by keeping the highest severity", () => {
    const points = [
      buildIndicatorPoint({ index: 0, drawdownRate: -0.1 }),
      buildIndicatorPoint({ index: 1, drawdownRate: -0.16 }),
      buildIndicatorPoint({ index: 2, drawdownRate: -0.2 }),
      buildIndicatorPoint({ index: 3, drawdownRate: -0.18 }),
      buildIndicatorPoint({ index: 4, drawdownRate: -0.05 }),
      buildIndicatorPoint({ index: 5, drawdownRate: -0.3 }),
    ];

    const result = detectCrashEvents(points, {
      mode: "single",
      coolingDays: 2,
      singleRule: {
        feature: "drawdownRate",
        operator: "<=",
        value: -0.15,
      },
    });

    expect(result.events).toHaveLength(2);
    expect(result.events.map((event) => event.index)).toEqual([2, 5]);
    expect(result.ranking[0].index).toBe(5);
    expect(result.ranking[0].severity).toBeGreaterThan(result.ranking[1].severity);
  });

  it("calculates score mode ranking on indicator points", () => {
    const candles = buildSyntheticCandles(320);
    const indicators = computeIndicators({ candles, symbol: "^N225" });

    const result = detectCrashEvents(indicators.points, {
      mode: "score",
      threshold: 0,
      coolingDays: 10,
      symbol: "^N225",
    });

    expect(result.scoredPoints).toHaveLength(indicators.points.length);
    expect(result.ranking.length).toBeGreaterThan(0);
    expect(result.ranking.every((event) => event.crashScore != null)).toBe(true);
  });
});
