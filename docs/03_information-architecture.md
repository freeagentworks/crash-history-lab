# Information Architecture

## App Routes (App Router)
- `/`
  - ダッシュボード
  - ティッカー入力、プリセット選択、ランキング、イベントサマリ
- `/events`
  - 暴落イベント一覧（フィルタ/ソート）
- `/events/[symbol]/[date]`
  - 単一イベント詳細チャート（前後期間指定）
- `/compare`
  - 4イベント比較ビュー
- `/similar`
  - 類似局面検索結果
- `/backtest`
  - テンプレート戦略の検証画面
- `/settings`
  - 指標パラメータ、デフォルト表示期間、UI設定

## Navigation
- Header: Symbol Search, Preset Dropdown, Period Picker
- Main Tabs: Events / Compare / Similar / Backtest / Settings
- Global Footer: 免責文

## State Domains
- Symbol State
- Indicator Parameter State
- Detection Mode State
- Event Selection State (max 4)
- Similarity Search Options
- Backtest Template/Params
