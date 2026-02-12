import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYahooCandles } from "../yahoo";

describe("fetchYahooCandles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries with .T when a 4-char symbol is not found", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chart: {
              error: { code: "Not Found", description: "No data found, symbol may be delisted" },
              result: null,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chart: {
              error: null,
              result: [
                {
                  timestamp: [1735689600],
                  indicators: {
                    quote: [
                      {
                        open: [100],
                        high: [102],
                        low: [99],
                        close: [101],
                        volume: [123456],
                      },
                    ],
                  },
                  meta: {
                    symbol: "7203.T",
                    currency: "JPY",
                    exchangeName: "JPX",
                    timezone: "Asia/Tokyo",
                  },
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

    const result = await fetchYahooCandles({ symbol: "7203", range: "1y" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/chart/7203?");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/chart/7203.T?");
    expect(result.meta.symbol).toBe("7203.T");
    expect(result.candles).toHaveLength(1);
  });
});
