"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Candle, CrashEvent } from "../lib/analytics/types";
import { buildEventDetailHref } from "../lib/navigation";
import { flatPresetSymbols } from "../lib/presets";
import {
  buildPathFromNullable,
  clamp,
  formatNumber,
  formatPct,
  percentIfRatio,
} from "../lib/ui-utils";
import { readUiSettings } from "../lib/ui-settings";

type DetectionMode = "score" | "single";

type MarketDataResponse = {
  candles: Candle[];
};

type CrashEventsResponse = {
  ranking: CrashEvent[];
};

type SimilarMatch = {
  date: string;
  similarityScore: number;
  featureDistance: number;
  dtwDistance: number;
  reasons: Array<{ feature: string; note: string }>;
  metrics: Partial<Record<string, number>>;
};

type SimilarResponse = {
  matches: SimilarMatch[];
};

function buildEventSparkline(
  candles: Candle[],
  date: string,
  preDays: number,
  postDays: number,
): string {
  const idx = candles.findIndex((candle) => candle.date === date);
  if (idx < 0) return "";

  const start = clamp(idx - preDays, 0, candles.length - 1);
  const end = clamp(idx + postDays, 0, candles.length - 1);
  const window = candles.slice(start, end + 1);
  if (window.length < 2) return "";

  const base = window[0].close || 1;
  return buildPathFromNullable(
    window.map((candle) => (candle.close / base) * 100),
    460,
    110,
  );
}

export function SimilarLive() {
  const uiSettings = useMemo(() => readUiSettings(), []);

  const [symbol, setSymbol] = useState("^N225");
  const [range, setRange] = useState(uiSettings.defaultRange);
  const [mode, setMode] = useState<DetectionMode>(uiSettings.defaultMode);
  const [threshold, setThreshold] = useState(uiSettings.threshold);
  const [coolingDays, setCoolingDays] = useState(uiSettings.coolingDays);
  const [topN, setTopN] = useState(5);
  const [preDays, setPreDays] = useState(uiSettings.preDays);
  const [postDays, setPostDays] = useState(uiSettings.postDays);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [targetDate, setTargetDate] = useState("");
  const [matches, setMatches] = useState<SimilarMatch[]>([]);

  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetEvent = useMemo(
    () => events.find((event) => event.date === targetDate) ?? null,
    [events, targetDate],
  );

  const targetSparkline = useMemo(
    () => buildEventSparkline(candles, targetDate, preDays, postDays),
    [candles, targetDate, preDays, postDays],
  );

  const detailContext = useMemo(
    () => ({
      range,
      mode,
      threshold,
      coolingDays,
      preDays,
      postDays,
      params: uiSettings.indicators,
    }),
    [range, mode, threshold, coolingDays, preDays, postDays, uiSettings.indicators],
  );

  async function loadEvents() {
    if (!symbol.trim()) {
      setError("銘柄コードを入力してください。");
      return;
    }

    setError(null);
    setIsLoadingEvents(true);

    try {
      const marketResponse = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(symbol.trim())}&range=${encodeURIComponent(range)}`,
      );
      if (!marketResponse.ok) throw new Error("市場データの取得に失敗しました。");
      const market = (await marketResponse.json()) as MarketDataResponse;

      const crashResponse = await fetch("/api/crash-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim(),
          mode,
          threshold,
          coolingDays,
          candles: market.candles,
          params: uiSettings.indicators,
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

      if (!crashResponse.ok) throw new Error("イベント抽出に失敗しました。");
      const crash = (await crashResponse.json()) as CrashEventsResponse;

      const ranking = crash.ranking ?? [];
      setCandles(market.candles ?? []);
      setEvents(ranking);
      setTargetDate(ranking[0]?.date ?? "");
      setMatches([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setCandles([]);
      setEvents([]);
      setTargetDate("");
      setMatches([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }

  async function runSimilarSearch() {
    if (!targetDate) {
      setError("ターゲットイベント日を選択してください。");
      return;
    }

    setError(null);
    setIsLoadingSimilar(true);

    try {
      const response = await fetch("/api/similar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          targetDate,
          topN,
          preDays,
          postDays,
          mode,
          threshold,
          coolingDays,
          candles,
          events,
        }),
      });

      if (!response.ok) throw new Error("類似局面検索に失敗しました。");
      const payload = (await response.json()) as SimilarResponse;
      setMatches(payload.matches ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setMatches([]);
    } finally {
      setIsLoadingSimilar(false);
    }
  }

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
            <span className="text-muted">プリセット</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              defaultValue=""
              onChange={(e) => setSymbol(e.target.value)}
            >
              <option value="" disabled>
                選択
              </option>
              {flatPresetSymbols.map((preset) => (
                <option key={preset.symbol} value={preset.symbol}>
                  {preset.label} ({preset.symbol})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">取得期間</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>
          <button
            onClick={loadEvents}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            disabled={isLoadingEvents}
          >
            {isLoadingEvents ? "読込中..." : "イベント読込"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
          <label className="space-y-1">
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
            <span className="text-muted">Top N</span>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-muted">ターゲットイベント日</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            >
              {events.length === 0 ? <option value="">イベント未読込</option> : null}
              {events.map((event) => (
                <option key={event.date} value={event.date}>
                  {event.date} (Score {formatNumber(event.crashScore, 1)})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-muted">前</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={preDays}
                onChange={(e) => setPreDays(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">後</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={postDays}
                onChange={(e) => setPostDays(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <button
          onClick={runSimilarSearch}
          className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          disabled={isLoadingSimilar || events.length === 0}
        >
          {isLoadingSimilar ? "検索中..." : "類似局面を検索"}
        </button>

        {error ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">ターゲットイベント</h2>
          {targetEvent ? (
            <div className="mt-3 rounded-xl bg-panel-strong p-3">
              <p className="font-display text-xl font-bold">{symbol}</p>
              <p className="font-mono text-sm text-muted">{targetEvent.date}</p>
              <Link
                href={buildEventDetailHref({
                  symbol: targetEvent.symbol ?? symbol,
                  date: targetEvent.date,
                  context: detailContext,
                })}
                className="mt-2 inline-block rounded-lg border border-line px-2 py-1 text-xs hover:border-accent hover:text-accent"
              >
                詳細で開く
              </Link>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="metric-pill">Score {formatNumber(targetEvent.crashScore, 1)}</span>
                <span className="metric-pill">
                  DD {formatPct(percentIfRatio(targetEvent.metrics.drawdownRate), 1)}
                </span>
                <span className="metric-pill">
                  10d {formatPct(percentIfRatio(targetEvent.metrics.drawdownSpeed), 1)}
                </span>
              </div>
              <div className="mt-3 rounded-lg border border-line bg-panel p-2">
                <svg viewBox="0 0 460 110" className="h-24 w-full">
                  <path d={targetSparkline} fill="none" stroke="#005f73" strokeWidth="2.8" />
                </svg>
              </div>
              <p className="mt-2 text-xs text-muted">
                検索範囲: 同一銘柄内（初期値） / データ本数 {candles.length.toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">イベントを読み込むと表示されます。</p>
          )}
        </article>

        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">Top 類似イベント</h2>
          <div className="mt-3 space-y-2">
            {matches.length === 0 ? (
              <p className="text-sm text-muted">検索結果はまだありません。</p>
            ) : (
              matches.map((match, index) => {
                const sparkline = buildEventSparkline(candles, match.date, preDays, postDays);
                return (
                  <div key={match.date} className="rounded-xl border border-line bg-panel px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        #{index + 1} {symbol} <span className="font-mono text-xs text-muted">{match.date}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-ok/15 px-2 py-1 text-xs font-semibold text-ok">
                          類似度 {formatNumber(match.similarityScore, 1)}%
                        </span>
                        <Link
                          href={buildEventDetailHref({
                            symbol,
                            date: match.date,
                            context: detailContext,
                          })}
                          className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent hover:text-accent"
                        >
                          詳細
                        </Link>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Feature距離 {formatNumber(match.featureDistance, 4)} / DTW距離 {formatNumber(match.dtwDistance, 4)}
                    </p>
                    <div className="mt-1 rounded-lg border border-line bg-panel-strong p-1.5">
                      <svg viewBox="0 0 460 100" className="h-16 w-full">
                        <path d={sparkline} fill="none" stroke="#2a9d8f" strokeWidth="2.2" />
                      </svg>
                    </div>
                    <ul className="mt-1 text-sm text-muted">
                      {match.reasons.map((reason) => (
                        <li key={`${match.date}-${reason.feature}`}>- {reason.note}</li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>
    </>
  );
}
