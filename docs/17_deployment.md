# Deployment Guide (Vercel / Netlify)

`web` サブディレクトリ構成のまま問題なくデプロイ可能。

## Vercel
1. Import Repository
2. Project Settings > Root Directory を `web` に設定
3. Build Command: `npm run build`（default）
4. Install Command: `npm install`（default）
5. Deploy

補足:
- `web/vercel.json` を配置済み
- Next.js App Router API routes をそのままデプロイ可能

## Netlify
- `netlify.toml` をリポジトリ直下に配置済み
- 主要設定:
  - Base directory: `web`
  - Build command: `npm run build`
  - Publish directory: `.next`
  - Plugin: `@netlify/plugin-nextjs`

## Why subdirectory is OK
- `docs/` と実装 (`web/`) を分離できる
- 将来、分析バッチや別フロントを追加しやすい
- Monorepo構成として一般的
