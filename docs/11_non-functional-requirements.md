# Non-Functional Requirements

## Performance
- 初回描画目標: 3秒以内（直近10年相当）
- イベント再計算: 1.5秒以内（単一銘柄）

## Reliability
- Yahoo Finance取得失敗時の明示的エラー
- API失敗時の再試行（指数バックオフ）

## Maintainability
- モジュール分離（data/indicator/detection/similarity/backtest）
- 指標追加が低コストで可能な設計

## Security
- 初期は認証なし公開（URL知っている人のみ）
- 将来認証導入を前提にサーバ境界を維持

## Internationalization Readiness
- UI文言を辞書化し、将来英語化対応

## Compliance
- 投資助言ではない旨の免責を常時表示
