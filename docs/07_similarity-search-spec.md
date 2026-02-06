# Similarity Search Spec

## Scope
- 初期値: 同一銘柄内検索
- 将来拡張: プリセット銘柄横断

## Method (hybrid)
1. 候補抽出
- イベント窓（前10/後50）から特徴量ベクトルを生成
- 距離指標で上位Kを抽出（cosine + euclidean）

2. 再ランキング
- 価格系列に対してDTW距離を計算し再順位付け

## Features
- リターン系列（複数ホライズン）
- 変動率（ATR%, HV）
- レジーム（below200, slope200）
- パニック強度（volumeShock, gapDownFreq, dd）

## Output
- Top-N類似イベント
- 類似スコア
- 主要差分（どの特徴が似て/異なるか）
