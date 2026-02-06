# UI Spec

## Global
- Header: Symbol input + Preset select + Range setting
- Footer: 免責文（常時表示）

## Dashboard (`/`)
- 左: ランキングテーブル（ソート/フィルタ）
- 右: イベントサマリ（スコア内訳）
- 下: イベントチャート（マーカー付）

## Compare (`/compare`)
- 4パネル固定グリッド
- x軸をイベント日基準で同期
- 指標表示ON/OFF

## Similar (`/similar`)
- ターゲットイベント選択
- 類似Top-N表示
- 類似理由（特徴寄与）をテキスト表示

## Backtest (`/backtest`)
- テンプレート選択
- パラメータ入力
- 結果KPI + エクイティカーブ + トレード表

## Settings (`/settings`)
- 指標パラメータ編集
- デフォルト期間（前後日数、初期表示年数）
- 表示言語設定（MVPは日本語固定、内部は文言キー化）
