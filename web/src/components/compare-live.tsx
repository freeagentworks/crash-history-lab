"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Candle, CrashEvent } from "../lib/analytics/types";
import { buildLinePath, formatNumber, formatPct, percentIfRatio } from "../lib/ui-utils";

type DetectionMode = "score" | "single";

type MarketDataResponse = {
  candles: Candle[];
};

type CrashEventsResponse = {
  ranking: CrashEvent[];
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTargets(raw: string | null): string[] {
  if (!raw) return [];
  return unique(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

export function CompareLive() {
  const searchParams = useSearchParams();

  const initialSymbol = searchParams.get("symbol") ?? "^N225";
  const initialRange = searchParams.get("range") ?? "10y";
  const initialMode = (searchParams.get("mode") as DetectionMode | null) ?? "score";
  const initialThreshold = Number(searchParams.get("threshold") ?? "70");
  const initialCoolingDays = Number(searchParams.get("coolingDays") ?? "10");
  const initialTargets = parseTargets(searchParams.get("targets")).slice(0, 4);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState(initialRange);
  const [mode, setMode] = useState<DetectionMode>(initialMode);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [coolingDays, setCoolingDays] = useState(initialCoolingDays);
  const [preDays, setPreDays] = useState(10);
  const [postDays, setPostDays] = useState(50);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>(initialTargets);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const marketResponse = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
      );
      if (!marketResponse.ok) throw new Error("市場データの取得に失敗しました。");
      const market = (await marketResponse.json()) as MarketDataResponse;

      const crashResponse = await fetch("/api/crash-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          mode,
          threshold,
          coolingDays,
          candles: market.candles,
          singleRule:
            mode === "single"
              ? {
                  feature: "drawdownRate",
                  operator: "<=",
                  value: -0.15,
                }
              : undefined,
        }),
      });

      if (!crashResponse.ok) throw new Error("暴落判定の取得に失敗しました。");
      const crash = (await crashResponse.json()) as CrashEventsResponse;

      const ranking = crash.ranking ?? [];
      setCandles(market.candles ?? []);
      setEvents(ranking);

      setSelectedDates((prev) => {
        const valid = prev.filter((date) => ranking.some((event) => event.date === date));
        if (valid.length > 0) return valid.slice(0, 4);
        return ranking.slice(0, 4).map((event) => event.date);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setCandles([]);
      setEvents([]);
      setSelectedDates([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      if (prev.includes(date)) return prev.filter((v) => v !== date);
      if (prev.length >= 4) return prev;
      return [...prev, date];
    });
  }

  const compareCards = useMemo(() => {
    return selectedDates
      .map((date) => {
        const event = events.find((candidate) => candidate.date === date);
        if (!event) return null;

        const idx = candles.findIndex((candle) => candle.date === date);
        if (idx < 0) return null;

        const start = clamp(idx - preDays, 0, candles.length - 1);
        const end = clamp(idx + postDays, 0, candles.length - 1);
        const window = candles.slice(start, end + 1);

        if (window.length < 2) return null;

        const base = window[0].close || 1;
        const normalized = window.map((candle) => (candle.close / base) * 100);
        const path = buildLinePath(normalized, 620, 220);

        return {
          event,
          path,
          markerIndex: idx - start,
          length: window.length,
        };
      })
      .filter(
        (
          item,
        ): item is {
          event: CrashEvent;
          path: string;
          markerIndex: number;
          length: number;
        } => item != null,
      );
  }, [selectedDates, events, candles, preDays, postDays]);

  return (
    <>
      <section className="glass-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted">銘柄</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">期間</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">判定モード</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={mode}
              onChange={(e) => setMode(e.target.value as DetectionMode)}
            >
              <option value="score">スコア方式</option>
              <option value="single">単一条件</option>
            </select>
          </label>
          <button onClick={loadData} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">
            {isLoading ? "更新中..." : "更新"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-muted">閾値</span>
            <input
              type="number"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">クーリング日数</span>
            <input
              type="number"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={coolingDays}
              onChange={(e) => setCoolingDays(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">前日数</span>
            <input
              type="number"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={preDays}
              onChange={(e) => setPreDays(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">後日数</span>
            <input
              type="number"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={postDays}
              onChange={(e) => setPostDays(Number(e.target.value))}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="glass-card p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold">比較対象の選択（最大4件）</h2>
        <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-auto">
          {events.map((event) => {
            const checked = selectedDates.includes(event.date);
            return (
              <label key={event.date} className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDate(event.date)}
                  className="h-4 w-4"
                />
                <span className="font-mono">{event.date}</span>
                <span className="text-muted">Score {formatNumber(event.crashScore, 1)}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {compareCards.length === 0 ? (
          <article className="glass-card p-4 text-sm text-muted lg:col-span-2">
            比較対象がありません。イベントを読み込んで、対象日を選択してください。
          </article>
        ) : (
          compareCards.map((card) => {
            const xMarker =
              14 +
              (card.markerIndex / Math.max(card.length - 1, 1)) *
                (620 - 28);
            const dd = percentIfRatio(card.event.metrics.drawdownRate);
            const speed = percentIfRatio(card.event.metrics.drawdownSpeed);

            return (
              <article key={card.event.date} className="glass-card p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">
                    {symbol} <span className="font-mono text-sm text-muted">{card.event.date}</span>
                  </h2>
                  <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                    Score {formatNumber(card.event.crashScore, 1)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-line bg-gradient-to-r from-panel to-[#f8f4ea] p-3">
                  <svg viewBox="0 0 620 220" className="h-52 w-full">
                    <path d={card.path} fill="none" stroke="#005f73" strokeWidth="3" />
                    <line
                      x1={xMarker}
                      x2={xMarker}
                      y1={12}
                      y2={208}
                      stroke="#ae2012"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  </svg>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="metric-pill">DD {formatPct(dd, 1)}</span>
                  <span className="metric-pill">10d {formatPct(speed, 1)}</span>
                  <span className="metric-pill">
                    Vol {formatNumber(card.event.metrics.volumeShock, 2)}x
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
