"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { defaultCrashScoreWeights } from "../lib/analytics/config";
import type { Candle, CrashEvent, CrashFeatureKey, IndicatorPoint } from "../lib/analytics/types";
import { flatPresetSymbols } from "../lib/presets";
import { formatNumber, formatPct, percentIfRatio } from "../lib/ui-utils";
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

const rangeOptions = [
  { label: "10年（デフォルト）", value: "10y" },
  { label: "全期間", value: "max" },
  { label: "5年", value: "5y" },
  { label: "2年", value: "2y" },
];

const featureLabels: Record<CrashFeatureKey, string> = {
  zScore: "Z値",
  rsi: "RSI",
  crsi: "CRSI",
  drawdownRate: "DD率",
  drawdownSpeed: "DD速度",
  atrPct: "ATR%",
  volumeShock: "出来高Shock",
  regime200: "200日線レジーム",
  gapDownFreq: "ギャップ頻度",
  low52w: "52週安値",
  breadth: "ブレッドス",
};

const weightPills = Object.entries(defaultCrashScoreWeights).map(([key, value]) => ({
  key: key as CrashFeatureKey,
  weight: value,
}));

function buildPathFromNullable(
  values: Array<number | null>,
  width: number,
  height: number,
  bounds?: { min: number; max: number },
): string {
  const valid = values
    .map((value, index) => (value == null || !Number.isFinite(value) ? null : { index, value }))
    .filter((point): point is { index: number; value: number } => point != null);

  if (valid.length === 0) return "";

  const padding = 10;
  const min = bounds?.min ?? Math.min(...valid.map((point) => point.value));
  const max = bounds?.max ?? Math.max(...valid.map((point) => point.value));
  const span = max - min || 1;

  return valid
    .map((point, idx) => {
      const x =
        padding +
        (point.index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.value - min) / span) * (height - padding * 2);

      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function computeAverageDrawdown(events: CrashEvent[]): number | null {
  const values = events
    .map((event) => event.metrics.drawdownRate)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);

  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function computeRecoveryDays(candles: Candle[], eventDate: string): number | null {
  const idx = candles.findIndex((candle) => candle.date === eventDate);
  if (idx < 0) return null;

  const eventClose = candles[idx].close;
  for (let i = idx + 1; i < candles.length; i += 1) {
    if (candles[i].close >= eventClose) {
      return i - idx;
    }
  }

  return null;
}

function computeAverageRecovery(candles: Candle[], events: CrashEvent[]): number | null {
  const values = events
    .map((event) => computeRecoveryDays(candles, event.date))
    .filter((value): value is number => value != null);

  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function LiveDashboard() {
  const initialSettings = useMemo(() => readUiSettings(), []);

  const [symbol, setSymbol] = useState("^N225");
  const [range, setRange] = useState(initialSettings.defaultRange);
  const [mode, setMode] = useState<DetectionMode>(initialSettings.defaultMode);
  const [threshold, setThreshold] = useState(initialSettings.threshold);
  const [coolingDays, setCoolingDays] = useState(initialSettings.coolingDays);
  const [preDays, setPreDays] = useState(initialSettings.preDays);
  const [postDays, setPostDays] = useState(initialSettings.postDays);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicatorPoints, setIndicatorPoints] = useState<IndicatorPoint[]>([]);
  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const indicatorMap = useMemo(
    () => new Map(indicatorPoints.map((point) => [point.date, point])),
    [indicatorPoints],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.date === selectedDate) ?? null,
    [events, selectedDate],
  );

  const eventWindow = useMemo(() => {
    if (!selectedEvent) return [];
    const eventIdx = candles.findIndex((candle) => candle.date === selectedEvent.date);
    if (eventIdx < 0) return [];

    const start = Math.max(0, eventIdx - preDays);
    const end = Math.min(candles.length - 1, eventIdx + postDays);
    return candles.slice(start, end + 1);
  }, [candles, selectedEvent, preDays, postDays]);

  const eventMarkerIndex = useMemo(() => {
    if (!selectedEvent) return -1;
    return eventWindow.findIndex((candle) => candle.date === selectedEvent.date);
  }, [selectedEvent, eventWindow]);

  const closePath = useMemo(
    () => buildPathFromNullable(eventWindow.map((candle) => candle.close), 620, 240),
    [eventWindow],
  );

  const smaPath = useMemo(
    () =>
      buildPathFromNullable(
        eventWindow.map((candle) => indicatorMap.get(candle.date)?.sma200 ?? null),
        620,
        240,
      ),
    [eventWindow, indicatorMap],
  );

  const rsiPath = useMemo(
    () =>
      buildPathFromNullable(
        eventWindow.map((candle) => indicatorMap.get(candle.date)?.rsi ?? null),
        620,
        100,
        { min: 0, max: 100 },
      ),
    [eventWindow, indicatorMap],
  );

  const atrPath = useMemo(
    () =>
      buildPathFromNullable(
        eventWindow.map((candle) => indicatorMap.get(candle.date)?.atrPct ?? null),
        620,
        100,
      ),
    [eventWindow, indicatorMap],
  );

  const avgDrawdown = useMemo(() => computeAverageDrawdown(events), [events]);
  const avgRecovery = useMemo(
    () => computeAverageRecovery(candles, events.slice(0, 30)),
    [candles, events],
  );

  async function runDetection() {
    if (!symbol.trim()) {
      setError("銘柄コードを入力してください。");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const marketResponse = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(symbol.trim())}&range=${encodeURIComponent(range)}`,
      );

      if (!marketResponse.ok) {
        throw new Error("市場データの取得に失敗しました。");
      }

      const market = (await marketResponse.json()) as MarketDataResponse;

      const [indicatorResponse, crashResponse] = await Promise.all([
        fetch("/api/indicators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: symbol.trim(),
            candles: market.candles,
            params: initialSettings.indicators,
          }),
        }),
        fetch("/api/crash-events", {
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
        }),
      ]);

      if (!indicatorResponse.ok) {
        throw new Error("指標計算に失敗しました。");
      }
      if (!crashResponse.ok) {
        throw new Error("暴落イベントの判定に失敗しました。");
      }

      const indicators = (await indicatorResponse.json()) as IndicatorsResponse;
      const crash = (await crashResponse.json()) as CrashEventsResponse;

      const ranking = crash.ranking ?? [];
      setCandles(market.candles ?? []);
      setIndicatorPoints(indicators.points ?? []);
      setEvents(ranking);
      setSelectedDate(ranking[0]?.date ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setCandles([]);
      setIndicatorPoints([]);
      setEvents([]);
      setSelectedDate(null);
    } finally {
      setIsLoading(false);
    }
  }

  const indicatorSnapshot = useMemo(() => {
    if (!selectedEvent) return [] as Array<{ label: string; value: string }>;

    const eventPoint = indicatorMap.get(selectedEvent.date);
    if (!eventPoint) return [];

    return [
      { label: "Z値", value: formatNumber(eventPoint.zScore, 2) },
      { label: "RSI", value: formatNumber(eventPoint.rsi, 2) },
      { label: "CRSI", value: formatNumber(eventPoint.crsi, 2) },
      { label: "DD率", value: formatPct(percentIfRatio(eventPoint.drawdownRate), 1) },
      { label: "DD速度", value: formatPct(percentIfRatio(eventPoint.drawdownSpeed), 1) },
      { label: "ATR%", value: formatPct(eventPoint.atrPct, 2) },
      { label: "出来高Shock", value: `${formatNumber(eventPoint.volumeShock, 2)}x` },
      { label: "200日線割れ", value: eventPoint.below200 == null ? "-" : eventPoint.below200 ? "Yes" : "No" },
      { label: "200日線傾き", value: formatNumber(eventPoint.slope200, 4) },
      { label: "ギャップ頻度", value: formatNumber(eventPoint.gapDownFreq, 1) },
      { label: "52週安値", value: eventPoint.is52wLow == null ? "-" : eventPoint.is52wLow ? "Yes" : "No" },
      { label: "ブレッドス", value: formatNumber(eventPoint.breadth, 1) },
    ];
  }, [selectedEvent, indicatorMap]);

  return (
    <>
      <section className="glass-card p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <label className="space-y-1 text-sm">
            <span className="text-muted">銘柄コード</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono outline-none focus:border-accent"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="例: ^N225"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted">プリセット</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none focus:border-accent"
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
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none focus:border-accent"
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

          <label className="space-y-1 text-sm">
            <span className="text-muted">判定モード</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none focus:border-accent"
              value={mode}
              onChange={(e) => setMode(e.target.value as DetectionMode)}
            >
              <option value="score">スコア方式</option>
              <option value="single">単一条件</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              onClick={runDetection}
              className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[#014a59] disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "計算中..." : "検出を実行"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-muted">閾値（score）</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">クーリング日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={coolingDays}
              onChange={(e) => setCoolingDays(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">前日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={preDays}
              onChange={(e) => setPreDays(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">後日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
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

      <section className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">イベント件数</p>
          <p className="mt-2 font-display text-3xl font-bold">{events.length}</p>
          <p className="mt-2 text-sm text-muted">クーリング{coolingDays}日で統合</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">平均ドローダウン</p>
          <p className="mt-2 font-display text-3xl font-bold text-danger">{formatPct(avgDrawdown, 1)}</p>
          <p className="mt-2 text-sm text-muted">ランキング上位群</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">平均回復日数</p>
          <p className="mt-2 font-display text-3xl font-bold">{avgRecovery == null ? "-" : `${avgRecovery.toFixed(1)}日`}</p>
          <p className="mt-2 text-sm text-muted">イベント日終値への回復</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">現在モード</p>
          <p className="mt-2 font-display text-2xl font-bold">{mode === "score" ? "スコア方式" : "単一条件"}</p>
          <p className="mt-2 text-sm text-muted">閾値 {threshold}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-line px-4 py-3 md:px-5">
            <h2 className="font-display text-lg font-semibold">暴落ランキング</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-panel-strong text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">日付</th>
                  <th className="px-4 py-3">銘柄</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">DD</th>
                  <th className="px-4 py-3">10d</th>
                  <th className="px-4 py-3">出来高Shock</th>
                  <th className="px-4 py-3">詳細</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted">
                      まだ結果がありません。「検出を実行」を押してください。
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const isSelected = event.date === selectedDate;
                    const dd = percentIfRatio(event.metrics.drawdownRate);
                    const d10 = percentIfRatio(event.metrics.drawdownSpeed);
                    const vol = event.metrics.volumeShock;

                    return (
                      <tr
                        key={`${event.date}-${event.index}`}
                        className={`cursor-pointer border-t border-line/70 ${
                          isSelected ? "bg-accent/10" : ""
                        }`}
                        onClick={() => setSelectedDate(event.date)}
                      >
                        <td className="px-4 py-2.5 font-mono">{event.date}</td>
                        <td className="px-4 py-2.5">{event.symbol ?? symbol}</td>
                        <td className="px-4 py-2.5 font-semibold text-danger">
                          {formatNumber(event.crashScore, 1)}
                        </td>
                        <td className="px-4 py-2.5 text-danger">{formatPct(dd, 1)}</td>
                        <td className="px-4 py-2.5 text-danger">{formatPct(d10, 1)}</td>
                        <td className="px-4 py-2.5">{vol == null ? "-" : `${vol.toFixed(2)}x`}</td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/events/${encodeURIComponent(event.symbol ?? symbol)}/${event.date}`}
                            className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent hover:text-accent"
                            onClick={(e) => e.stopPropagation()}
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
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">スコア重み（初期値）</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {weightPills.map((item) => (
              <span key={item.key} className="metric-pill">
                {featureLabels[item.key]} {(item.weight * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">イベント前後チャート（価格 + 指標）</h2>
          <div className="flex gap-2 text-xs md:text-sm">
            <span className="rounded-full bg-panel-strong px-3 py-1">前{preDays}日</span>
            <span className="rounded-full bg-panel-strong px-3 py-1">後{postDays}日</span>
            <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">イベント日マーカー</span>
          </div>
        </div>

        {eventWindow.length === 0 ? (
          <p className="mt-4 text-sm text-muted">ランキングからイベントを選択すると表示されます。</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <div className="space-y-3 rounded-xl border border-line bg-gradient-to-br from-panel to-[#f8f1e4] p-3">
              <div>
                <p className="mb-1 text-xs text-muted">Close (青) / SMA200 (橙)</p>
                <svg viewBox="0 0 620 240" className="h-56 w-full">
                  <path d={closePath} fill="none" stroke="#005f73" strokeWidth="3.2" />
                  <path d={smaPath} fill="none" stroke="#ee9b00" strokeWidth="2.4" />
                  {eventMarkerIndex >= 0 ? (
                    <line
                      x1={14 + (eventMarkerIndex / Math.max(eventWindow.length - 1, 1)) * (620 - 28)}
                      x2={14 + (eventMarkerIndex / Math.max(eventWindow.length - 1, 1)) * (620 - 28)}
                      y1={12}
                      y2={228}
                      stroke="#ae2012"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  ) : null}
                </svg>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted">RSI</p>
                <svg viewBox="0 0 620 100" className="h-24 w-full">
                  <line x1="10" y1="30" x2="610" y2="30" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
                  <line x1="10" y1="70" x2="610" y2="70" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
                  <path d={rsiPath} fill="none" stroke="#9b2226" strokeWidth="2.5" />
                </svg>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted">ATR%</p>
                <svg viewBox="0 0 620 100" className="h-24 w-full">
                  <path d={atrPath} fill="none" stroke="#2a9d8f" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel p-3">
              <h3 className="font-display text-base font-semibold">選択イベント</h3>
              <p className="mt-1 font-mono text-sm text-muted">{selectedEvent?.date ?? "-"}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedEvent?.signals && Object.keys(selectedEvent.signals).length > 0 ? (
                  (Object.entries(selectedEvent.signals) as Array<[CrashFeatureKey, number]>).map(
                    ([key, value]) => (
                      <span key={key} className="metric-pill">
                        {featureLabels[key]} {value.toFixed(1)}
                      </span>
                    ),
                  )
                ) : (
                  <p className="text-sm text-muted">シグナル内訳なし</p>
                )}
              </div>

              <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-auto text-xs">
                {indicatorSnapshot.map((item) => (
                  <div key={item.label} className="rounded-lg bg-panel-strong px-2 py-1.5">
                    <p className="text-muted">{item.label}</p>
                    <p className="font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
