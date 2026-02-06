import Link from "next/link";
import { AppShell } from "../../../../components/app-shell";
import { detectCrashEvents } from "../../../../lib/analytics/crash-detection";
import { computeIndicators } from "../../../../lib/analytics/indicators";
import { fetchYahooCandles } from "../../../../lib/analytics/yahoo";
import { buildLinePath, formatNumber, formatPct, percentIfRatio } from "../../../../lib/ui-utils";
import type { CrashFeatureKey, CrashEvent } from "../../../../lib/analytics/types";

type EventDetailPageProps = {
  params: Promise<{ symbol: string; date: string }>;
};

type EventDetailData = {
  event: CrashEvent;
  closePath: string;
  markerX: number;
  preDays: number;
  postDays: number;
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

async function loadEventDetail(symbol: string, date: string): Promise<EventDetailData | null> {
  const market = await fetchYahooCandles({ symbol, range: "10y" });
  const indicators = computeIndicators({ candles: market.candles, symbol });
  const detection = detectCrashEvents(indicators.points, {
    mode: "score",
    threshold: 70,
    coolingDays: 10,
    symbol,
  });

  const targetEvent =
    detection.events.find((event) => event.date === date) ??
    detection.ranking.find((event) => event.date === date);

  if (!targetEvent) return null;

  const preDays = 10;
  const postDays = 50;
  const idx = market.candles.findIndex((candle) => candle.date === targetEvent.date);

  if (idx < 0) return null;

  const start = Math.max(0, idx - preDays);
  const end = Math.min(market.candles.length - 1, idx + postDays);
  const window = market.candles.slice(start, end + 1);

  if (window.length === 0) return null;

  const closePath = buildLinePath(
    window.map((candle) => candle.close),
    620,
    240,
  );

  const markerX = 14 + ((idx - start) / Math.max(window.length - 1, 1)) * (620 - 28);

  const topSignals = (Object.entries(targetEvent.signals) as Array<[CrashFeatureKey, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    event: targetEvent,
    closePath,
    markerX,
    preDays,
    postDays,
    topSignals,
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const resolved = await params;
  const symbol = decodeURIComponent(resolved.symbol);
  const date = resolved.date;

  let detail: EventDetailData | null = null;
  let loadError: string | null = null;

  try {
    detail = await loadEventDetail(symbol, date);
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
        <Link href="/events" className="glass-card inline-block px-4 py-2 text-sm hover:border-accent">
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
          指定イベントが見つかりませんでした。ランキング条件（threshold=70, cooling=10）で再抽出した結果に存在しない可能性があります。
        </section>
        <Link href="/events" className="glass-card inline-block px-4 py-2 text-sm hover:border-accent">
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
          <Link href="/events" className="rounded-xl border border-line px-3 py-2 text-sm hover:border-accent">
            一覧へ戻る
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">イベント前後チャート</h2>
          <div className="mt-4 rounded-xl border border-line bg-gradient-to-br from-panel via-[#fbf6ea] to-panel p-3">
            <svg viewBox="0 0 620 240" className="h-64 w-full">
              <path d={detail.closePath} fill="none" stroke="#005f73" strokeWidth="3.5" />
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
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="metric-pill">前{detail.preDays}日</span>
            <span className="metric-pill">後{detail.postDays}日</span>
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
