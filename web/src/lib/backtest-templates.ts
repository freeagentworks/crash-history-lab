export const backtestTemplates = [
  {
    id: "mean-rebound",
    name: "逆張りリバウンド",
    summary: "暴落スコア急騰 + RSI低下局面を逆張りで拾う",
  },
  {
    id: "ma200-reclaim",
    name: "200日線回復順張り",
    summary: "暴落後のトレンド再獲得を追随する",
  },
] as const;

export type BacktestTemplateId = (typeof backtestTemplates)[number]["id"];
