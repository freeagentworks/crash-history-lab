import { describe, expect, it } from "vitest";
import { computeIndicators } from "../indicators";
import { buildSyntheticCandles } from "./test-helpers";

describe("computeIndicators", () => {
  it("normalizes and sorts candles before calculation", () => {
    const candles = buildSyntheticCandles(320);
    const reversed = [...candles].reverse();

    const { points } = computeIndicators({ candles: reversed, symbol: "^GSPC" });

    expect(points).toHaveLength(320);
    expect(points[0].date < points[points.length - 1].date).toBe(true);
  });

  it("produces core crash indicators after warm-up period", () => {
    const candles = buildSyntheticCandles(340);
    const { points } = computeIndicators({ candles, symbol: "^N225" });
    const last = points[points.length - 1];

    expect(last.zScore).not.toBeNull();
    expect(last.rsi).not.toBeNull();
    expect(last.crsi).not.toBeNull();
    expect(last.drawdownRate).not.toBeNull();
    expect(last.drawdownSpeed).not.toBeNull();
    expect(last.atrPct).not.toBeNull();
    expect(last.volumeShock).not.toBeNull();
    expect(last.sma200).not.toBeNull();
    expect(last.slope200).not.toBeNull();
    expect(last.regime200).not.toBeNull();
    expect(last.gapDownFreq).not.toBeNull();
    expect(last.is52wLow).not.toBeNull();
  });

  it("sets breadth only for index-like symbols", () => {
    const candles = buildSyntheticCandles(260);
    const indexResult = computeIndicators({ candles, symbol: "^N225" });
    const stockResult = computeIndicators({ candles, symbol: "AAPL" });

    expect(indexResult.points[indexResult.points.length - 1].breadth).not.toBeNull();
    expect(stockResult.points[stockResult.points.length - 1].breadth).toBeNull();
  });
});
