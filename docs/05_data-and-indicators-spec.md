# Data and Indicators Spec

## Data Model
`Candle`
- `date: string (YYYY-MM-DD)`
- `open: number`
- `high: number`
- `low: number`
- `close: number`
- `volume: number`

## Default Indicator Params (editable)
- `zScore.window = 20`
- `rsi.window = 14`
- `crsi.rsiWindow = 3`
- `drawdown.lookback = 252`
- `drawdownSpeed.w1 = 5`
- `drawdownSpeed.w2 = 10`
- `atr.window = 14`
- `volumeShock.window = 20`
- `ma200.window = 200`
- `gapDown.window = 20`
- `gapDown.thresholdPct = -2.0`
- `low52.window = 252`
- `breadth.window = 20`

## Indicator Definitions
1. Z値
- `z = (close - SMA(close, n)) / STD(close, n)`

2. RSI
- 標準RSI (Wilder)

3. CRSI
- Connors RSI (RSI + streak RSI + rank component)

4. ドローダウン率
- `dd = close / rollingMax(close, n) - 1`

5. ドローダウン速度
- `dds5 = close/close[-5]-1`
- `dds10 = close/close[-10]-1`

6. ATR%
- `atrPct = ATR(n) / close * 100`

7. 出来高ショック
- `volShock = volume / SMA(volume, n)`

8. 200日線レジーム
- `below200 = close < SMA200`
- `slope200 = SMA200 - SMA200[-5]`

9. ギャップダウン頻度
- `gap = (open - prevClose) / prevClose * 100`
- `gapDownFreq = count(gap <= threshold, window)`

10. 52週安値更新
- `is52wLow = close <= rollingMin(close, 252)`

11. ブレッドス（指数のみ）
- 例: 構成銘柄の上昇/下落比、200日線上比率
- 対象外資産では `N/A`
