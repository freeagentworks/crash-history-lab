# Backtest Spec (Template-based)

## Templates (MVP)
1. 逆張りリバウンド
- Entry: 暴落スコアが閾値超え + RSI過熱売られ
- Exit: 利確/損切り or 保有日数上限

2. 200日線回復順張り
- Entry: 暴落後に`close > SMA200`再回復 + `slope200 > 0`
- Exit: 再び`close < SMA200`またはトレーリング

## Parameters
- 閾値、保有日数、利確/損切り、再エントリー制御
- コスト/スリッページ（デフォルトOFF、任意ON）

## Metrics
- CAGR
- Max Drawdown
- Sharpe Ratio
- Sortino Ratio
- Calmar Ratio
- Win Rate
- Profit Factor
- Avg Holding Days

## Reporting
- エクイティカーブ
- 取引一覧
- 指標別感度比較
