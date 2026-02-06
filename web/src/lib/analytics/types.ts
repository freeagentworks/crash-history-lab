export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorParams = {
  zScore: { window: number };
  rsi: { window: number };
  crsi: { rsiWindow: number; streakWindow: number; rankWindow: number };
  drawdown: { lookback: number };
  drawdownSpeed: { window1: number; window2: number };
  atr: { window: number };
  volumeShock: { window: number };
  ma200: { window: number; slopeLookback: number };
  gapDown: { window: number; thresholdPct: number };
  low52w: { window: number };
  breadth: { window: number };
};

export type CrashFeatureKey =
  | "zScore"
  | "rsi"
  | "crsi"
  | "drawdownRate"
  | "drawdownSpeed"
  | "atrPct"
  | "volumeShock"
  | "regime200"
  | "gapDownFreq"
  | "low52w"
  | "breadth";

export type CrashScoreWeights = Record<CrashFeatureKey, number>;

export type IndicatorPoint = Candle & {
  dayReturnPct: number | null;
  zScore: number | null;
  rsi: number | null;
  crsi: number | null;
  drawdownRate: number | null;
  drawdownSpeed5: number | null;
  drawdownSpeed10: number | null;
  drawdownSpeed: number | null;
  atr: number | null;
  atrPct: number | null;
  volumeShock: number | null;
  sma200: number | null;
  slope200: number | null;
  below200: boolean | null;
  regime200: number | null;
  gapDownPct: number | null;
  gapDownFreq: number | null;
  is52wLow: boolean | null;
  breadth: number | null;
};

export type DetectionMode = "single" | "score";

export type SingleRule = {
  feature: CrashFeatureKey;
  operator: "<" | "<=" | ">" | ">=";
  value: number;
};

export type CrashEvent = {
  index: number;
  symbol?: string;
  date: string;
  crashScore: number | null;
  severity: number;
  signals: Partial<Record<CrashFeatureKey, number>>;
  metrics: Partial<Record<CrashFeatureKey, number>>;
};

export type CrashDetectionOptions = {
  mode: DetectionMode;
  threshold?: number;
  coolingDays?: number;
  symbol?: string;
  singleRule?: SingleRule;
  weights?: Partial<CrashScoreWeights>;
};
