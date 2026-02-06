# API Spec (Route Handlers)

## GET `/api/market-data`
Query:
- `symbol` (required)
- `from` (optional)
- `to` (optional)
- `interval=d` (fixed for MVP)

Response:
- `symbol`
- `candles[]`

## POST `/api/indicators`
Body:
- `candles[]`
- `params`

Response:
- `candlesWithIndicators[]`

## POST `/api/crash-events`
Body:
- `candlesWithIndicators[]`
- `mode: single | score`
- `ruleOrWeights`

Response:
- `events[]`
- `ranking[]`

## POST `/api/similar-events`
Body:
- `symbol`
- `targetEvent`
- `scope: sameSymbol`
- `topN`

Response:
- `matches[]`

## POST `/api/backtest`
Body:
- `symbol`
- `templateId`
- `params`
- `costModel`

Response:
- `summaryMetrics`
- `equityCurve[]`
- `trades[]`
