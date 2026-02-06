"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Candle, CrashEvent, IndicatorParams, IndicatorPoint } from "../lib/analytics/types";
import { buildEventDetailHref } from "../lib/navigation";
import {
  buildPathFromNullable,
  formatNumber,
  formatPct,
  percentIfRatio,
  clamp,
} from "../lib/ui-utils";
import { readUiSettings } from "../lib/ui-settings";

type DetectionMode = "score" | "single";

type MarketDataResponse = {
  candles: Candle[];
};

type IndicatorsResponse = {
  points: IndicatorPoint[];
};

type CrashEventsResponse = {
  ranking: CrashEvent[];
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
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

function safeQueryNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIndicatorParams(raw: string | null): Partial<IndicatorParams> | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<IndicatorParams>;
    if (parsed && typeof parsed === "object") return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

export function CompareLive() {
  const searchParams = useSearchParams();
  const uiSettings = useMemo(() => readUiSettings(), []);

  const initialSymbol = searchParams.get("symbol") ?? "^N225";
  const initialRange = searchParams.get("range") ?? uiSettings.defaultRange;
  const rawMode = searchParams.get("mode");
  const initialMode =
    rawMode === "single" || rawMode === "score" ? rawMode : uiSettings.defaultMode;
  const initialThreshold = safeQueryNumber(searchParams.get("threshold"), uiSettings.threshold);
  const initialCoolingDays = safeQueryNumber(searchParams.get("coolingDays"), uiSettings.coolingDays);
  const initialPreDays = safeQueryNumber(searchParams.get("preDays"), uiSettings.preDays);
  const initialPostDays = safeQueryNumber(searchParams.get("postDays"), uiSettings.postDays);
  const indicatorParams = parseIndicatorParams(searchParams.get("params")) ?? uiSettings.indicators;
  const initialTargets = parseTargets(searchParams.get("targets")).slice(0, 4);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState(initialRange);
  const [mode, setMode] = useState<DetectionMode>(initialMode);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [coolingDays, setCoolingDays] = useState(initialCoolingDays);
  const [preDays, setPreDays] = useState(initialPreDays);
  const [postDays, setPostDays] = useState(initialPostDays);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicatorPoints, setIndicatorPoints] = useState<IndicatorPoint[]>([]);
  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>(initialTargets);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indicatorMap = useMemo(
    () => new Map(indicatorPoints.map((point) => [point.date, point])),
    [indicatorPoints],
  );

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const marketResponse = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
      );
      if (!marketResponse.ok) throw new Error("市場データの取得に失敗しました。");
      const market = (await marketResponse.json()) as MarketDataResponse;

      const [indicatorsResponse, crashResponse] = await Promise.all([
        fetch("/api/indicators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            candles: market.candles,
            params: indicatorParams,
          }),
        }),
        fetch("/api/crash-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            mode,
            threshold,
            coolingDays,
            candles: market.candles,
            params: indicatorParams,
            singleRule:
              mode === "single"
                ? {
                    feature: "drawdownRate",
                    operator: "<=",
                    value: -0.15,
                  }
                : undefined,
          }),
        }),
      ]);

      if (!indicatorsResponse.ok) throw new Error("指標計算の取得に失敗しました。");
      if (!crashResponse.ok) throw new Error("暴落判定の取得に失敗しました。");

      const indicators = (await indicatorsResponse.json()) as IndicatorsResponse;
      const crash = (await crashResponse.json()) as CrashEventsResponse;

      const ranking = crash.ranking ?? [];
      setCandles(market.candles ?? []);
      setIndicatorPoints(indicators.points ?? []);
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
      setIndicatorPoints([]);
      setEvents([]);
      setSelectedDates([]);
    } finally {
      setIsLoading(false);
    }
  }

  const detailContext = useMemo(
    () => ({
      range,
      mode,
      threshold,
      coolingDays,
      preDays,
      postDays,
      params: indicatorParams,
    }),
    [range, mode, threshold, coolingDays, preDays, postDays, indicatorParams],
  );

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

        const baseClose = window[0].close || 1;
        const closePath = buildPathFromNullable(
          window.map((candle) => (candle.close / baseClose) * 100),
          620,
          180,
        );

        const smaPath = buildPathFromNullable(
          window.map((candle) => {
            const sma = indicatorMap.get(candle.date)?.sma200;
            if (sma == null || !Number.isFinite(sma)) return null;
            return (sma / baseClose) * 100;
          }),
          620,
          180,
        );

        const rsiPath = buildPathFromNullable(
          window.map((candle) => indicatorMap.get(candle.date)?.rsi ?? null),
          620,
          90,
          { min: 0, max: 100 },
        );

        return {
          event,
          closePath,
          smaPath,
          rsiPath,
          markerIndex: idx - start,
          length: window.length,
        };
      })
      .filter(
        (
          item,
        ): item is {
          event: CrashEvent;
          closePath: string;
          smaPath: string;
          rsiPath: string;
          markerIndex: number;
          length: number;
        } => item != null,
      );
  }, [selectedDates, events, candles, preDays, postDays, indicatorMap]);

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
              10 +
              (card.markerIndex / Math.max(card.length - 1, 1)) *
                (620 - 20);
            const dd = percentIfRatio(card.event.metrics.drawdownRate);
            const speed = percentIfRatio(card.event.metrics.drawdownSpeed);

            return (
              <article key={card.event.date} className="glass-card p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">
                    {symbol} <span className="font-mono text-sm text-muted">{card.event.date}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                      Score {formatNumber(card.event.crashScore, 1)}
                    </span>
                    <Link
                      href={buildEventDetailHref({
                        symbol: card.event.symbol ?? symbol,
                        date: card.event.date,
                        context: detailContext,
                      })}
                      className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent hover:text-accent"
                    >
                      詳細
                    </Link>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-line bg-gradient-to-r from-panel to-[#f8f4ea] p-3">
                  <p className="mb-1 text-xs text-muted">Close(青) / SMA200(橙)</p>
                  <svg viewBox="0 0 620 180" className="h-44 w-full">
                    <path d={card.closePath} fill="none" stroke="#005f73" strokeWidth="3" />
                    <path d={card.smaPath} fill="none" stroke="#ee9b00" strokeWidth="2.2" />
                    <line
                      x1={xMarker}
                      x2={xMarker}
                      y1={10}
                      y2={170}
                      stroke="#ae2012"
                      strokeWidth="1.8"
                      strokeDasharray="6 4"
                    />
                  </svg>
                </div>

                <div className="mt-2 rounded-xl border border-line bg-panel p-2">
                  <p className="mb-1 text-xs text-muted">RSI</p>
                  <svg viewBox="0 0 620 90" className="h-20 w-full">
                    <line x1="10" y1="25" x2="610" y2="25" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
                    <line x1="10" y1="65" x2="610" y2="65" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
                    <path d={card.rsiPath} fill="none" stroke="#9b2226" strokeWidth="2.2" />
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
