# Preset Config Spec

## 方針
プリセット銘柄は管理画面を作らず、設定ファイル編集で管理する。

## File
- `config/presets.json`

## Schema (example)
```json
{
  "groups": [
    {
      "id": "major_indices",
      "label": "主要指数",
      "symbols": [
        { "label": "日経平均", "symbol": "^N225" },
        { "label": "S&P 500", "symbol": "^GSPC" }
      ]
    },
    {
      "id": "mag7",
      "label": "Magnificent 7",
      "symbols": [
        { "label": "Apple", "symbol": "AAPL" },
        { "label": "Microsoft", "symbol": "MSFT" },
        { "label": "NVIDIA", "symbol": "NVDA" },
        { "label": "Amazon", "symbol": "AMZN" },
        { "label": "Meta", "symbol": "META" },
        { "label": "Alphabet", "symbol": "GOOGL" },
        { "label": "Tesla", "symbol": "TSLA" }
      ]
    },
    {
      "id": "fx_crypto",
      "label": "FX & Crypto",
      "symbols": [
        { "label": "BTC/USD", "symbol": "BTC-USD" },
        { "label": "USD/JPY", "symbol": "JPY=X" },
        { "label": "EUR/USD", "symbol": "EURUSD=X" }
      ]
    }
  ]
}
```

## Validation Rules
- `label` は空不可
- `symbol` はYahoo Financeで解決可能であること
- グループIDは一意
