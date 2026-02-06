# Crash Detection and Scoring Spec

## Modes
1. 単一条件モード
- 指定した1指標しきい値で判定
- 例: `dd <= -0.15`

2. スコアモード
- 複数指標を0-100で正規化して加重合成
- `crashScore = Σ(weight_i * signal_i)`

## Initial Weights (accuracy-oriented baseline)
- `drawdownRate: 0.18`
- `drawdownSpeed: 0.14`
- `atrPct: 0.11`
- `volumeShock: 0.09`
- `regime200: 0.10`
- `gapDownFreq: 0.08`
- `zScore: 0.07`
- `rsi: 0.05`
- `crsi: 0.05`
- `low52w: 0.05`
- `breadth: 0.08`

## Handling N/A
- ブレッドスがN/Aの場合、利用可能指標で重みを再正規化

## Signal Normalization
- 外れ値に強い正規化（robust scaling + clipping）
- 暴落寄与方向を統一（悪化ほど高スコア）

## Event Extraction
- `crashScore >= threshold` の日を候補化
- 近接イベントはクーリング期間で統合（例: 10営業日）

## Ranking
- Primary: `crashScore desc`
- Secondary: `drawdownSpeed desc`, `volumeShock desc`
