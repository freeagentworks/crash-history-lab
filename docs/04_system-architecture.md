# System Architecture

## Stack
- Frontend: Next.js 16, React, TypeScript, Tailwind
- Chart: Lightweight Charts or Plotly.js (実装時に1つへ統一)
- Server Runtime: Node.js (Route Handlers)
- Data Provider: Yahoo Finance
- Cache: in-memory + optional KV (将来)

## Modules
1. `marketDataService`
- Yahoo FinanceからOHLCV取得
- 取得結果の正規化

2. `indicatorEngine`
- 各種テクニカル指標計算
- 欠損処理、ウォームアップ期間管理

3. `crashDetector`
- 単一条件判定
- スコア判定と重み再正規化

4. `similarityEngine`
- 特徴量距離計算
- DTW再ランキング

5. `backtestEngine`
- テンプレート戦略シミュレーション
- KPI計算

## Caching Strategy
- キー: `symbol + interval + from + to + providerVersion`
- TTL: 1日（研究用途のため十分）
- 指標計算結果はパラメータハッシュで分離

## Error Handling
- データ欠損時は警告バナー表示
- ブレッドス未対応資産では `N/A` を明示
- 外部取得失敗時はリトライ + フォールバック表示
