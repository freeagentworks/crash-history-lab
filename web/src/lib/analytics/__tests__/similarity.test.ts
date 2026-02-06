import { describe, expect, it } from "vitest";
import { findSimilarEvents } from "../similarity";
import { buildCrashEvent, buildFullMetrics, dateAt, toIndicatorPointsFromCandles } from "./test-helpers";

describe("findSimilarEvents", () => {
  it("ranks the closest event first in hybrid (feature + DTW) similarity", () => {
    const candles = toIndicatorPointsFromCandles(
      Array.from({ length: 220 }, (_, i) => {
        const wave = Math.sin(i / 8) * 1.2;
        const localShock =
          i === 80 || i === 81
            ? -7
            : i === 100 || i === 101
              ? -6.8
              : i === 120
                ? 4.4
                : i === 140
                  ? -2.5
                  : 0;
        const close = 100 + i * 0.12 + wave + localShock;
        return {
          date: dateAt(i),
          open: close - 0.2,
          high: close + 0.8,
          low: close - 0.9,
          close,
          volume: 100_000 + (i % 5) * 2_000,
        };
      }),
    );

    const events = [
      buildCrashEvent({
        index: 80,
        date: dateAt(80),
        crashScore: 90,
        metrics: buildFullMetrics(),
      }),
      buildCrashEvent({
        index: 100,
        date: dateAt(100),
        crashScore: 88,
        metrics: buildFullMetrics({
          drawdownRate: -0.238,
          drawdownSpeed: -0.098,
          atrPct: 3.75,
          volumeShock: 2.05,
          zScore: -2.35,
        }),
      }),
      buildCrashEvent({
        index: 120,
        date: dateAt(120),
        crashScore: 45,
        metrics: buildFullMetrics({
          drawdownRate: -0.08,
          drawdownSpeed: -0.02,
          atrPct: 1.1,
          volumeShock: 1.1,
          regime200: 0,
          zScore: -0.4,
          rsi: 52,
          crsi: 57,
          low52w: 0,
          breadth: 58,
        }),
      }),
      buildCrashEvent({
        index: 140,
        date: dateAt(140),
        crashScore: 68,
        metrics: buildFullMetrics({
          drawdownRate: -0.19,
          drawdownSpeed: -0.07,
          atrPct: 2.9,
          volumeShock: 1.8,
          zScore: -1.8,
          rsi: 30,
          crsi: 29,
        }),
      }),
    ];

    const result = findSimilarEvents({
      candles,
      events,
      targetDate: dateAt(80),
      topN: 2,
      preDays: 10,
      postDays: 20,
    });

    expect(result.matches).toHaveLength(2);
    const topDates = result.matches.map((match) => match.date);
    expect(topDates).toContain(dateAt(100));
    expect(topDates).not.toContain(dateAt(120));

    const nearMatch = result.matches.find((match) => match.date === dateAt(100));
    expect(nearMatch).toBeDefined();
    expect(nearMatch!.similarityScore).toBeGreaterThanOrEqual(0);
    expect(nearMatch!.similarityScore).toBeLessThanOrEqual(100);
    expect(nearMatch!.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
