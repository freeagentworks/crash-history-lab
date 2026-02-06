import Link from "next/link";
import { AppShell } from "../../../../components/app-shell";
import { detectCrashEvents } from "../../../../lib/analytics/crash-detection";
import { computeIndicators } from "../../../../lib/analytics/indicators";
import type { CrashFeatureKey, CrashEvent, IndicatorPoint } from "../../../../lib/analytics/types";
import { fetchYahooCandles } from "../../../../lib/analytics/yahoo";
import { buildEventsListHref, type EventDetailContext, parseEventDetailContext } from "../../../../lib/navigation";
import {
  buildCandlestickGlyphs,
  buildPathFromNullable,
  computePriceBounds,
  formatNumber,
  formatPct,
  percentIfRatio,
  resolveCandlestickBodyWidth,
  type CandlestickGlyph,
} from "../../../../lib/ui-utils";

type EventDetailPageProps = {
  params: Promise<{ symbol: string; date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type EventDetailData = {
  event: CrashEvent;
  candlesticks: CandlestickGlyph[];
  candleBodyWidth: number;
  smaPath: string;
  rsiPath: string;
  atrPath: string;
  markerX: number;
  preDays: number;
  postDays: number;
  range: string;
  mode: "score" | "single";
  threshold: number;
  coolingDays: number;
  indicatorSnapshot: Array<{ label: string; value: string }>;
  topSignals: Array<[CrashFeatureKey, number]>;
};

const featureLabels: Record<CrashFeatureKey, string> = {
  zScore: "Z値",
  rsi: "RSI",
  crsi: "CRSI",
  drawdownRate: "ドローダウン率",
  drawdownSpeed: "ドローダウン速度",
  atrPct: "ATR%",
  volumeShock: "出来高ショック",
  regime200: "200日線レジーム",
  gapDownFreq: "ギャップダウン頻度",
  low52w: "52週安値",
  breadth: "ブレッドス",
};

function buildIndicatorSnapshot(point: IndicatorPoint | undefined): Array<{ label: string; value: string }> {
  if (!point) return [];

  return [
    { label: "Z値", value: formatNumber(point.zScore, 2) },
    { label: "RSI", value: formatNumber(point.rsi, 2) },
    { label: "CRSI", value: formatNumber(point.crsi, 2) },
    { label: "DD率", value: formatPct(percentIfRatio(point.drawdownRate), 1) },
    { label: "DD速度", value: formatPct(percentIfRatio(point.drawdownSpeed), 1) },
    { label: "ATR%", value: formatPct(point.atrPct, 2) },
    { label: "出来高Shock", value: `${formatNumber(point.volumeShock, 2)}x` },
    { label: "200日線割れ", value: point.below200 == null ? "-" : point.below200 ? "Yes" : "No" },
    { label: "200日線傾き", value: formatNumber(point.slope200, 4) },
    { label: "ギャップ頻度", value: formatNumber(point.gapDownFreq, 1) },
    { label: "52週安値", value: point.is52wLow == null ? "-" : point.is52wLow ? "Yes" : "No" },
    { label: "ブレッドス", value: formatNumber(point.breadth, 1) },
  ];
}

async function loadEventDetail(
  symbol: string,
  date: string,
  context: EventDetailContext,
): Promise<EventDetailData | null> {
  const market = await fetchYahooCandles({ symbol, range: context.range });
  const indicators = computeIndicators({ candles: market.candles, symbol, params: context.params });
  const detection = detectCrashEvents(indicators.points, {
    mode: context.mode,
    threshold: context.threshold,
    coolingDays: context.coolingDays,
    symbol,
  });

  const targetEvent =
    detection.events.find((event) => event.date === date) ??
    detection.ranking.find((event) => event.date === date);

  if (!targetEvent) return null;

  const preDays = Math.max(1, Math.round(context.preDays));
  const postDays = Math.max(1, Math.round(context.postDays));
  const idx = market.candles.findIndex((candle) => candle.date === targetEvent.date);

  if (idx < 0) return null;

  const start = Math.max(0, idx - preDays);
  const end = Math.min(market.candles.length - 1, idx + postDays);
  const window = market.candles.slice(start, end + 1);

  if (window.length === 0) return null;

  const pointMap = new Map(indicators.points.map((point) => [point.date, point]));

  const priceBounds = computePriceBounds(
    window,
    window.map((candle) => pointMap.get(candle.date)?.sma200 ?? null),
  );
  if (!priceBounds) return null;

  const candlesticks = buildCandlestickGlyphs(window, 620, 240, priceBounds);
  const candleBodyWidth = resolveCandlestickBodyWidth(window.length, 620);

  const smaPath = buildPathFromNullable(
    window.map((candle) => pointMap.get(candle.date)?.sma200 ?? null),
    620,
    240,
    priceBounds,
  );
  const rsiPath = buildPathFromNullable(
    window.map((candle) => pointMap.get(candle.date)?.rsi ?? null),
    620,
    100,
    { min: 0, max: 100 },
  );
  const atrPath = buildPathFromNullable(
    window.map((candle) => pointMap.get(candle.date)?.atrPct ?? null),
    620,
    100,
  );

  const markerX = 14 + ((idx - start) / Math.max(window.length - 1, 1)) * (620 - 28);

  const topSignals = (Object.entries(targetEvent.signals) as Array<[CrashFeatureKey, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    event: targetEvent,
    candlesticks,
    candleBodyWidth,
    smaPath,
    rsiPath,
    atrPath,
    markerX,
    preDays,
    postDays,
    range: context.range,
    mode: context.mode,
    threshold: context.threshold,
    coolingDays: context.coolingDays,
    indicatorSnapshot: buildIndicatorSnapshot(pointMap.get(targetEvent.date)),
    topSignals,
  };
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const [resolved, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const symbol = decodeURIComponent(resolved.symbol);
  const date = resolved.date;
  const context = parseEventDetailContext(resolvedSearchParams);
  const backHref = buildEventsListHref({ symbol, context });

  let detail: EventDetailData | null = null;
  let loadError: string | null = null;

  try {
    detail = await loadEventDetail(symbol, date, context);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  if (loadError) {
    return (
      <AppShell
        title={`イベント詳細: ${symbol}`}
        subtitle={`${date} を中心に前後チャートと指標寄与を確認します。`}
      >
        <section className="glass-card p-4 md:p-5 text-sm text-danger">
          データ取得または計算に失敗しました: {loadError}
        </section>
        <Link href={backHref} className="glass-card inline-block px-4 py-2 text-sm hover:border-accent">
          一覧へ戻る
        </Link>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell
        title={`イベント詳細: ${symbol}`}
        subtitle={`${date} を中心に前後チャートと指標寄与を確認します。`}
      >
        <section className="glass-card p-4 md:p-5 text-sm text-muted">
          指定イベントが見つかりませんでした。ランキング条件（mode={context.mode}, threshold=
          {formatNumber(context.threshold, 0)}, cooling={formatNumber(context.coolingDays, 0)}）で再抽出した結果に存在しない可能性があります。
        </section>
        <Link href={backHref} className="glass-card inline-block px-4 py-2 text-sm hover:border-accent">
          一覧へ戻る
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`イベント詳細: ${symbol}`}
      subtitle={`${detail.event.date} を中心に前後チャートと指標寄与を確認します。`}
    >
      <section className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Target Event</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {symbol} <span className="font-mono text-lg">{detail.event.date}</span>
            </p>
            <p className="mt-1 text-sm text-muted">Score {formatNumber(detail.event.crashScore, 1)}</p>
          </div>
          <Link href={backHref} className="rounded-xl border border-line px-3 py-2 text-sm hover:border-accent">
            一覧へ戻る
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">イベント前後チャート</h2>
          <div className="mt-4 rounded-xl border border-line bg-gradient-to-br from-panel via-[#fbf6ea] to-panel p-3">
            <p className="mb-1 text-xs text-muted">ローソク足 (上昇=青, 下落=朱) / SMA200(橙)</p>
            <svg viewBox="0 0 620 240" className="h-52 w-full">
              {detail.candlesticks.map((candle) => (
                <g key={candle.date}>
                  <line
                    x1={candle.x}
                    x2={candle.x}
                    y1={candle.wickTopY}
                    y2={candle.wickBottomY}
                    stroke={candle.isUp ? "#0a9396" : "#bb3e03"}
                    strokeWidth="1.2"
                  />
                  <rect
                    x={candle.x - detail.candleBodyWidth / 2}
                    y={candle.bodyTopY}
                    width={detail.candleBodyWidth}
                    height={candle.bodyHeight}
                    fill={candle.isUp ? "#0a9396" : "#bb3e03"}
                    opacity="0.88"
                    rx="1"
                  />
                </g>
              ))}
              <path d={detail.smaPath} fill="none" stroke="#ee9b00" strokeWidth="2.5" />
              <line
                x1={detail.markerX}
                x2={detail.markerX}
                y1={12}
                y2={228}
                stroke="#ae2012"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            </svg>

            <p className="mb-1 mt-3 text-xs text-muted">RSI</p>
            <svg viewBox="0 0 620 100" className="h-20 w-full">
              <line x1="10" y1="30" x2="610" y2="30" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
              <line x1="10" y1="70" x2="610" y2="70" stroke="#999" strokeDasharray="4 3" strokeWidth="1" />
              <path d={detail.rsiPath} fill="none" stroke="#9b2226" strokeWidth="2.3" />
            </svg>

            <p className="mb-1 mt-3 text-xs text-muted">ATR%</p>
            <svg viewBox="0 0 620 100" className="h-20 w-full">
              <path d={detail.atrPath} fill="none" stroke="#2a9d8f" strokeWidth="2.3" />
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="metric-pill">前{detail.preDays}日</span>
            <span className="metric-pill">後{detail.postDays}日</span>
            <span className="metric-pill">期間 {detail.range}</span>
            <span className="metric-pill">Mode {detail.mode}</span>
            <span className="metric-pill">閾値 {formatNumber(detail.threshold, 0)}</span>
            <span className="metric-pill">Cooling {formatNumber(detail.coolingDays, 0)}</span>
            <span className="metric-pill">
              DD {formatPct(percentIfRatio(detail.event.metrics.drawdownRate), 1)}
            </span>
            <span className="metric-pill">
              10d {formatPct(percentIfRatio(detail.event.metrics.drawdownSpeed), 1)}
            </span>
            <span className="metric-pill">
              Vol {formatNumber(detail.event.metrics.volumeShock, 2)}x
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {detail.indicatorSnapshot.map((item) => (
              <div key={item.label} className="rounded-lg bg-panel-strong px-2 py-1.5">
                <p className="text-muted">{item.label}</p>
                <p className="font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">指標寄与</h2>
          {detail.topSignals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">寄与データがありません。</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.topSignals.map(([key, value]) => (
                <li key={key} className="flex justify-between rounded-lg bg-panel-strong px-3 py-2">
                  <span>{featureLabels[key]}</span>
                  <span className="font-semibold text-danger">{formatNumber(value, 1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
