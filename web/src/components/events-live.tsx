"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Candle, CrashEvent } from "../lib/analytics/types";
import { flatPresetSymbols } from "../lib/presets";
import { formatNumber, formatPct, percentIfRatio } from "../lib/ui-utils";
import { readUiSettings } from "../lib/ui-settings";

type DetectionMode = "score" | "single";
type SortBy = "score" | "drawdownSpeed" | "volumeShock";

type MarketDataResponse = {
  candles: Candle[];
};

type CrashEventsResponse = {
  ranking: CrashEvent[];
};

const rangeOptions = [
  { label: "10年（デフォルト）", value: "10y" },
  { label: "全期間", value: "max" },
  { label: "5年", value: "5y" },
  { label: "2年", value: "2y" },
];

export function EventsLive() {
  const initialSettings = useMemo(() => readUiSettings(), []);

  const [symbol, setSymbol] = useState("^N225");
  const [range, setRange] = useState(initialSettings.defaultRange);
  const [mode, setMode] = useState<DetectionMode>(initialSettings.defaultMode);
  const [threshold, setThreshold] = useState(initialSettings.threshold);
  const [coolingDays, setCoolingDays] = useState(initialSettings.coolingDays);
  const [sortBy, setSortBy] = useState<SortBy>("score");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const sortedEvents = useMemo(() => {
    const copy = [...events];

    copy.sort((a, b) => {
      if (sortBy === "drawdownSpeed") {
        const av = a.metrics.drawdownSpeed ?? Number.POSITIVE_INFINITY;
        const bv = b.metrics.drawdownSpeed ?? Number.POSITIVE_INFINITY;
        return av - bv;
      }

      if (sortBy === "volumeShock") {
        const av = a.metrics.volumeShock ?? 0;
        const bv = b.metrics.volumeShock ?? 0;
        return bv - av;
      }

      return (b.crashScore ?? 0) - (a.crashScore ?? 0);
    });

    return copy;
  }, [events, sortBy]);

  const compareTargets = useMemo(() => {
    if (selectedDates.length > 0) return selectedDates.slice(0, 4);
    return sortedEvents.slice(0, 4).map((event) => event.date);
  }, [selectedDates, sortedEvents]);

  const compareHref = useMemo(() => {
    const query = new URLSearchParams();
    query.set("symbol", symbol);
    query.set("range", range);
    query.set("mode", mode);
    query.set("threshold", String(threshold));
    query.set("coolingDays", String(coolingDays));
    query.set("targets", compareTargets.join(","));
    return `/compare?${query.toString()}`;
  }, [symbol, range, mode, threshold, coolingDays, compareTargets]);

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      if (prev.includes(date)) return prev.filter((item) => item !== date);
      if (prev.length >= 4) return prev;
      return [...prev, date];
    });
  }

  async function runDetection() {
    if (!symbol.trim()) {
      setError("銘柄コードを入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const marketResponse = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(symbol.trim())}&range=${encodeURIComponent(range)}`,
      );
      if (!marketResponse.ok) {
        throw new Error("市場データの取得に失敗しました。");
      }

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
          params: initialSettings.indicators,
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

      if (!crashResponse.ok) {
        throw new Error("暴落判定に失敗しました。");
      }

      const crash = (await crashResponse.json()) as CrashEventsResponse;
      setEvents(crash.ranking ?? []);
      setSelectedDates([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setEvents([]);
    } finally {
      setIsLoading(false);
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
              onChange={(e) => setSymbol(e.target.value)}
              defaultValue=""
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
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={runDetection}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            disabled={isLoading}
          >
            {isLoading ? "計算中..." : "適用"}
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
            <span className="text-muted">並び順</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="score">Score降順</option>
              <option value="drawdownSpeed">ドローダウン速度</option>
              <option value="volumeShock">出来高ショック</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-5">
          <h2 className="font-display text-lg font-semibold">イベント候補</h2>
          <Link href={compareHref} className="rounded-xl border border-line px-3 py-1.5 text-sm hover:border-accent">
            比較へ ({compareTargets.length}/4)
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-panel-strong text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">選択</th>
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">銘柄</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">DD</th>
                <th className="px-4 py-3">10日速度</th>
                <th className="px-4 py-3">Vol Shock</th>
                <th className="px-4 py-3">詳細</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted">
                    まだ結果がありません。条件を設定して「適用」を押してください。
                  </td>
                </tr>
              ) : (
                sortedEvents.map((event) => {
                  const checked = selectedDates.includes(event.date);
                  const dd = percentIfRatio(event.metrics.drawdownRate);
                  const speed = percentIfRatio(event.metrics.drawdownSpeed);

                  return (
                    <tr key={`${event.date}-${event.index}`} className="border-t border-line/70">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDate(event.date)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono">{event.date}</td>
                      <td className="px-4 py-2.5">{event.symbol ?? symbol}</td>
                      <td className="px-4 py-2.5 font-semibold text-danger">
                        {formatNumber(event.crashScore, 1)}
                      </td>
                      <td className="px-4 py-2.5 text-danger">{formatPct(dd, 1)}</td>
                      <td className="px-4 py-2.5 text-danger">{formatPct(speed, 1)}</td>
                      <td className="px-4 py-2.5">{formatNumber(event.metrics.volumeShock, 2)}x</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/events/${encodeURIComponent(event.symbol ?? symbol)}/${event.date}`}
                          className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent hover:text-accent"
                        >
                          開く
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
