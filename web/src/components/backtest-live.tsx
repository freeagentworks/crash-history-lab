"use client";

import { useMemo, useState } from "react";
import { backtestTemplates, type BacktestTemplateId } from "../lib/backtest-templates";
import { flatPresetSymbols } from "../lib/presets";
import { buildLinePath, formatNumber, formatPct } from "../lib/ui-utils";
import { readUiSettings } from "../lib/ui-settings";

type BacktestResponse = {
  eventCount: number;
  summary: {
    templateId: BacktestTemplateId;
    totalReturnPct: number;
    cagrPct: number;
    maxDrawdownPct: number;
    sharpe: number;
    sortino: number;
    calmar: number;
    winRatePct: number;
    profitFactor: number;
    averageHoldingDays: number;
    trades: number;
  };
  equityCurve: Array<{ date: string; equity: number }>;
  trades: Array<{
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    grossReturnPct: number;
    netReturnPct: number;
    holdingDays: number;
    exitReason: string;
  }>;
};

const metricLabels = [
  ["totalReturnPct", "Total Return"],
  ["cagrPct", "CAGR"],
  ["maxDrawdownPct", "Max DD"],
  ["sharpe", "Sharpe"],
  ["sortino", "Sortino"],
  ["calmar", "Calmar"],
  ["winRatePct", "勝率"],
  ["profitFactor", "Profit Factor"],
  ["averageHoldingDays", "平均保有日数"],
  ["trades", "トレード数"],
] as const;

function toCsvValue(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header] ?? "")).join(",")),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BacktestLive() {
  const uiSettings = useMemo(() => readUiSettings(), []);

  const [symbol, setSymbol] = useState("^N225");
  const [range, setRange] = useState(uiSettings.defaultRange);
  const [templateId, setTemplateId] = useState<BacktestTemplateId>("mean-rebound");
  const [mode, setMode] = useState<"score" | "single">(uiSettings.defaultMode);
  const [threshold, setThreshold] = useState(uiSettings.threshold);
  const [coolingDays, setCoolingDays] = useState(uiSettings.coolingDays);

  const [entryThreshold, setEntryThreshold] = useState(70);
  const [rsiMax, setRsiMax] = useState(35);
  const [maxHoldDays, setMaxHoldDays] = useState(20);
  const [takeProfitPct, setTakeProfitPct] = useState(8);
  const [stopLossPct, setStopLossPct] = useState(-5);
  const [armWindowDays, setArmWindowDays] = useState(90);
  const [applyCosts, setApplyCosts] = useState(false);
  const [costPct, setCostPct] = useState(0.05);
  const [slippagePct, setSlippagePct] = useState(0.05);

  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equityPath = useMemo(() => {
    if (!result || result.equityCurve.length < 2) return "";
    const values = result.equityCurve.map((point) => point.equity);
    return buildLinePath(values, 620, 220);
  }, [result]);

  async function runBacktest() {
    if (!symbol.trim()) {
      setError("銘柄コードを入力してください。");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim(),
          range,
          templateId,
          mode,
          threshold,
          coolingDays,
          params: uiSettings.indicators,
          backtestParams: {
            entryThreshold,
            rsiMax,
            takeProfitPct,
            stopLossPct,
            maxHoldDays,
            armWindowDays,
            applyCosts,
            costPct,
            slippagePct,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(payload.detail ?? payload.error ?? "バックテストに失敗しました。");
      }

      const payload = (await response.json()) as BacktestResponse;
      setResult(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">テンプレート選択</h2>
          <div className="mt-3 space-y-2">
            {backtestTemplates.map((template) => (
              <label
                key={template.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel px-3 py-2"
              >
                <input
                  type="radio"
                  name="template"
                  checked={templateId === template.id}
                  onChange={() => setTemplateId(template.id)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-sm text-muted">{template.summary}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-2 text-sm">
            <label className="space-y-1">
              <span className="text-muted">銘柄</span>
              <input
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </label>
            <label className="space-y-1">
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
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted">期間</span>
                <input
                  className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-muted">モード</span>
                <select
                  className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "score" | "single")}
                >
                  <option value="score">スコア方式</option>
                  <option value="single">単一条件</option>
                </select>
              </label>
            </div>
          </div>
        </article>

        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">パラメータ</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-muted">判定閾値(score)</span>
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
              <span className="text-muted">エントリー閾値</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={entryThreshold}
                onChange={(e) => setEntryThreshold(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">RSI上限</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={rsiMax}
                onChange={(e) => setRsiMax(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">保有上限(日)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={maxHoldDays}
                onChange={(e) => setMaxHoldDays(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">回復監視日数</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={armWindowDays}
                onChange={(e) => setArmWindowDays(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">利確(%)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">損切り(%)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">コスト(%)</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={costPct}
                onChange={(e) => setCostPct(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">スリッページ(%)</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={slippagePct}
                onChange={(e) => setSlippagePct(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyCosts}
              onChange={(e) => setApplyCosts(e.target.checked)}
              className="h-4 w-4"
            />
            取引コスト/スリッページを適用
          </label>
          <button
            onClick={runBacktest}
            className="mt-3 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            disabled={isLoading}
          >
            {isLoading ? "シミュレーション中..." : "シミュレーション実行"}
          </button>
          {error ? (
            <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">評価指標</h2>
          {!result ? (
            <p className="mt-3 text-sm text-muted">実行するとここに結果が表示されます。</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">抽出イベント数: {result.eventCount}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {metricLabels.map(([key, label]) => {
                  const value = result.summary[key];
                  const isPct =
                    key === "totalReturnPct" ||
                    key === "cagrPct" ||
                    key === "maxDrawdownPct" ||
                    key === "winRatePct";

                  return (
                    <div key={key} className="rounded-xl bg-panel-strong px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                      <p className="font-display text-xl font-semibold">
                        {isPct ? formatPct(value as number, 2) : formatNumber(value as number, 3)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </article>

        <article className="glass-card p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold">エクイティカーブ</h2>
          <div className="mt-3 h-52 rounded-xl border border-line bg-gradient-to-br from-panel to-[#f8f2e7] p-3">
            {!equityPath ? (
              <p className="text-sm text-muted">バックテスト実行後に表示されます。</p>
            ) : (
              <svg viewBox="0 0 620 220" className="h-full w-full">
                <path d={equityPath} fill="none" stroke="#005f73" strokeWidth="3.5" />
              </svg>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">免責: 研究・教育用の簡易検証であり、投資助言ではありません。</p>
        </article>
      </section>

      <section className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">トレード一覧</h2>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent disabled:opacity-40"
              disabled={!result || result.trades.length === 0}
              onClick={() =>
                result &&
                downloadCsv(
                  `backtest_trades_${symbol}_${templateId}.csv`,
                  result.trades.map((trade) => ({
                    entryDate: trade.entryDate,
                    exitDate: trade.exitDate,
                    entryPrice: trade.entryPrice,
                    exitPrice: trade.exitPrice,
                    grossReturnPct: trade.grossReturnPct,
                    netReturnPct: trade.netReturnPct,
                    holdingDays: trade.holdingDays,
                    exitReason: trade.exitReason,
                  })),
                )
              }
            >
              Trades CSV
            </button>
            <button
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent disabled:opacity-40"
              disabled={!result || result.equityCurve.length === 0}
              onClick={() =>
                result &&
                downloadCsv(
                  `backtest_equity_${symbol}_${templateId}.csv`,
                  result.equityCurve.map((point) => ({
                    date: point.date,
                    equity: point.equity,
                  })),
                )
              }
            >
              Equity CSV
            </button>
          </div>
        </div>
        {!result || result.trades.length === 0 ? (
          <p className="mt-3 text-sm text-muted">トレードがありません。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-panel-strong text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Entry</th>
                  <th className="px-3 py-2">Exit</th>
                  <th className="px-3 py-2">Entry Price</th>
                  <th className="px-3 py-2">Exit Price</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2">Hold</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((trade, idx) => (
                  <tr key={`${trade.entryDate}-${trade.exitDate}-${idx}`} className="border-t border-line/70">
                    <td className="px-3 py-2 font-mono">{trade.entryDate}</td>
                    <td className="px-3 py-2 font-mono">{trade.exitDate}</td>
                    <td className="px-3 py-2">{formatNumber(trade.entryPrice, 2)}</td>
                    <td className="px-3 py-2">{formatNumber(trade.exitPrice, 2)}</td>
                    <td className="px-3 py-2">{formatPct(trade.grossReturnPct, 2)}</td>
                    <td className="px-3 py-2">{formatPct(trade.netReturnPct, 2)}</td>
                    <td className="px-3 py-2">{trade.holdingDays}日</td>
                    <td className="px-3 py-2">{trade.exitReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
