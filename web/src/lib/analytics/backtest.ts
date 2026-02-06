import type { CrashEvent, IndicatorPoint } from "./types";
import type { ScoredPoint } from "./crash-detection";

export type BacktestTemplateId = "mean-rebound" | "ma200-reclaim";

export type BacktestParams = {
  entryThreshold: number;
  rsiMax: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxHoldDays: number;
  armWindowDays: number;
  applyCosts: boolean;
  costPct: number;
  slippagePct: number;
};

export type BacktestTrade = {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  grossReturnPct: number;
  netReturnPct: number;
  holdingDays: number;
  exitReason: string;
};

export type EquityPoint = {
  date: string;
  equity: number;
};

export type BacktestSummary = {
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

export type BacktestResult = {
  summary: BacktestSummary;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
};

export const defaultBacktestParams: BacktestParams = {
  entryThreshold: 70,
  rsiMax: 35,
  takeProfitPct: 8,
  stopLossPct: -5,
  maxHoldDays: 20,
  armWindowDays: 90,
  applyCosts: false,
  costPct: 0.05,
  slippagePct: 0.05,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, value) => acc + (value - m) * (value - m), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function maxDrawdown(equityCurve: EquityPoint[]): number {
  if (equityCurve.length === 0) return 0;
  let peak = equityCurve[0].equity;
  let maxDd = 0;

  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = point.equity / peak - 1;
    if (dd < maxDd) maxDd = dd;
  }

  return maxDd;
}

function costsMultiplier(params: BacktestParams): number {
  if (!params.applyCosts) return 0;
  return (params.costPct + params.slippagePct) / 100;
}

function shouldEnterMeanRebound(
  prev: ScoredPoint,
  isCrashEvent: boolean,
  params: BacktestParams,
): boolean {
  if (!isCrashEvent) return false;
  if ((prev.crashScore ?? 0) < params.entryThreshold) return false;
  if (prev.rsi == null) return false;
  return prev.rsi <= params.rsiMax;
}

function shouldEnterTrendReclaim(
  point: IndicatorPoint,
  armedUntil: number,
  i: number,
): boolean {
  if (armedUntil < i) return false;
  if (point.sma200 == null || point.slope200 == null) return false;
  return point.close > point.sma200 && point.slope200 > 0;
}

function computeRatios(dailyReturns: number[]): {
  sharpe: number;
  sortino: number;
} {
  const avg = mean(dailyReturns);
  const s = std(dailyReturns);

  const downside = dailyReturns.filter((value) => value < 0);
  const downsideDev = downside.length > 0 ? std(downside) : 0;

  const sharpe = s > 1e-12 ? (avg / s) * Math.sqrt(252) : 0;
  const sortino = downsideDev > 1e-12 ? (avg / downsideDev) * Math.sqrt(252) : 0;

  return { sharpe, sortino };
}

function mergeParams(params?: Partial<BacktestParams>): BacktestParams {
  return {
    ...defaultBacktestParams,
    ...params,
  };
}

export function runBacktest(input: {
  templateId: BacktestTemplateId;
  scoredPoints: ScoredPoint[];
  events: CrashEvent[];
  params?: Partial<BacktestParams>;
}): BacktestResult {
  const templateId = input.templateId;
  const params = mergeParams(input.params);
  const eventDates = new Set(input.events.map((event) => event.date));

  const points = input.scoredPoints;
  if (points.length < 3) {
    return {
      summary: {
        templateId,
        totalReturnPct: 0,
        cagrPct: 0,
        maxDrawdownPct: 0,
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        winRatePct: 0,
        profitFactor: 0,
        averageHoldingDays: 0,
        trades: 0,
      },
      equityCurve: points.map((point) => ({ date: point.date, equity: 1 })),
      trades: [],
    };
  }

  const fee = costsMultiplier(params);

  let cash = 1;
  let qty = 0;
  let entryPrice = 0;
  let entryDate = "";
  let entryIndex = -1;
  let entryCapital = 1;
  let armedUntil = -1;

  const equityCurve: EquityPoint[] = [{ date: points[0].date, equity: 1 }];
  const trades: BacktestTrade[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const prev = points[i - 1];

    if (eventDates.has(prev.date)) {
      armedUntil = i + params.armWindowDays;
    }

    if (qty === 0) {
      const enterMean =
        templateId === "mean-rebound" &&
        shouldEnterMeanRebound(prev, eventDates.has(prev.date), params);

      const enterTrend =
        templateId === "ma200-reclaim" && shouldEnterTrendReclaim(point, armedUntil, i);

      if (enterMean || enterTrend) {
        const effectiveEntry = point.close * (1 + fee);
        if (effectiveEntry > 0) {
          qty = cash / effectiveEntry;
          entryPrice = point.close;
          entryDate = point.date;
          entryIndex = i;
          entryCapital = cash;
          cash = 0;
        }
      }
    } else {
      const holdDays = i - entryIndex;
      const grossReturn = point.close / entryPrice - 1;
      const hitTake = grossReturn >= params.takeProfitPct / 100;
      const hitStop = grossReturn <= params.stopLossPct / 100;
      const hitMaxHold = holdDays >= params.maxHoldDays;
      const breakTrend =
        templateId === "ma200-reclaim" && point.sma200 != null && point.close < point.sma200;

      let exitReason = "";
      if (hitTake) exitReason = "take-profit";
      else if (hitStop) exitReason = "stop-loss";
      else if (breakTrend) exitReason = "trend-break";
      else if (hitMaxHold) exitReason = "max-hold";

      if (exitReason || i === points.length - 1) {
        if (!exitReason) exitReason = "end-of-data";

        const effectiveExit = point.close * (1 - fee);
        cash = qty * effectiveExit;

        const grossRetPct = grossReturn * 100;
        const netRetPct = ((cash / entryCapital) - 1) * 100;

        trades.push({
          entryDate,
          exitDate: point.date,
          entryPrice,
          exitPrice: point.close,
          grossReturnPct: grossRetPct,
          netReturnPct: netRetPct,
          holdingDays: holdDays,
          exitReason,
        });

        qty = 0;
        entryPrice = 0;
        entryDate = "";
        entryIndex = -1;
      }
    }

    const markToMarket = qty > 0 ? qty * point.close : cash;
    equityCurve.push({ date: point.date, equity: markToMarket });
  }

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? 1;
  const totalReturn = finalEquity - 1;
  const years = Math.max((equityCurve.length - 1) / 252, 1 / 252);
  const cagr = finalEquity > 0 ? Math.pow(finalEquity, 1 / years) - 1 : -1;

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prevEq = equityCurve[i - 1].equity;
    const curEq = equityCurve[i].equity;
    if (prevEq <= 0) continue;
    dailyReturns.push(curEq / prevEq - 1);
  }

  const { sharpe, sortino } = computeRatios(dailyReturns);
  const mdd = maxDrawdown(equityCurve);
  const calmar = mdd < 0 ? cagr / Math.abs(mdd) : 0;

  const wins = trades.filter((trade) => trade.netReturnPct > 0);
  const losses = trades.filter((trade) => trade.netReturnPct < 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;

  const grossProfit = wins.reduce((acc, trade) => acc + trade.netReturnPct, 0);
  const grossLoss = losses.reduce((acc, trade) => acc + Math.abs(trade.netReturnPct), 0);
  const profitFactor = grossLoss > 1e-12 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  const avgHold =
    trades.length > 0
      ? trades.reduce((acc, trade) => acc + trade.holdingDays, 0) / trades.length
      : 0;

  return {
    summary: {
      templateId,
      totalReturnPct: totalReturn * 100,
      cagrPct: cagr * 100,
      maxDrawdownPct: mdd * 100,
      sharpe: clamp(sharpe, -10, 10),
      sortino: clamp(sortino, -10, 10),
      calmar: clamp(calmar, -10, 10),
      winRatePct: winRate * 100,
      profitFactor,
      averageHoldingDays: avgHold,
      trades: trades.length,
    },
    equityCurve,
    trades,
  };
}
