import { describe, expect, it } from "vitest";
import { runBacktest } from "../backtest";
import { buildCrashEvent, buildIndicatorPoint, dateAt } from "./test-helpers";

describe("runBacktest", () => {
  it("enters after crash event and exits on take-profit in mean-rebound template", () => {
    const points = [
      buildIndicatorPoint({ index: 0, close: 100, crashScore: 90, rsi: 22 }),
      buildIndicatorPoint({ index: 1, close: 100 }),
      buildIndicatorPoint({ index: 2, close: 106 }),
      buildIndicatorPoint({ index: 3, close: 108 }),
      buildIndicatorPoint({ index: 4, close: 110 }),
    ];
    const events = [buildCrashEvent({ index: 0, date: dateAt(0), crashScore: 90 })];

    const result = runBacktest({
      templateId: "mean-rebound",
      scoredPoints: points,
      events,
      params: {
        entryThreshold: 70,
        rsiMax: 35,
        takeProfitPct: 5,
        stopLossPct: -10,
        maxHoldDays: 10,
        armWindowDays: 20,
        applyCosts: false,
      },
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].entryDate).toBe(dateAt(1));
    expect(result.trades[0].exitDate).toBe(dateAt(2));
    expect(result.trades[0].exitReason).toBe("take-profit");
    expect(result.summary.totalReturnPct).toBeGreaterThan(0);
  });

  it("reduces net return when trading costs are enabled", () => {
    const points = [
      buildIndicatorPoint({ index: 0, close: 100, crashScore: 90, rsi: 22 }),
      buildIndicatorPoint({ index: 1, close: 100 }),
      buildIndicatorPoint({ index: 2, close: 106 }),
      buildIndicatorPoint({ index: 3, close: 108 }),
    ];
    const events = [buildCrashEvent({ index: 0, date: dateAt(0), crashScore: 90 })];

    const noCost = runBacktest({
      templateId: "mean-rebound",
      scoredPoints: points,
      events,
      params: {
        entryThreshold: 70,
        rsiMax: 35,
        takeProfitPct: 5,
        stopLossPct: -10,
        maxHoldDays: 10,
        armWindowDays: 20,
        applyCosts: false,
      },
    });

    const withCost = runBacktest({
      templateId: "mean-rebound",
      scoredPoints: points,
      events,
      params: {
        entryThreshold: 70,
        rsiMax: 35,
        takeProfitPct: 5,
        stopLossPct: -10,
        maxHoldDays: 10,
        armWindowDays: 20,
        applyCosts: true,
        costPct: 0.1,
        slippagePct: 0.1,
      },
    });

    expect(noCost.trades).toHaveLength(1);
    expect(withCost.trades).toHaveLength(1);
    expect(withCost.trades[0].netReturnPct).toBeLessThan(noCost.trades[0].netReturnPct);
  });
});
