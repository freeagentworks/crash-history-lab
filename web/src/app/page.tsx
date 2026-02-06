import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { LiveDashboard } from "../components/live-dashboard";

export default function HomePage() {
  return (
    <AppShell
      title="暴落イベント・ダッシュボード"
      subtitle="実データを取得して暴落ランキングを生成し、イベント前後の挙動を確認します。"
    >
      <LiveDashboard />

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/compare" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">比較ビュー</p>
          <p className="mt-1 text-sm text-muted">最大4イベントを並列比較</p>
        </Link>
        <Link href="/similar" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">類似検索</p>
          <p className="mt-1 text-sm text-muted">同一銘柄内の類似局面を探索</p>
        </Link>
        <Link href="/backtest" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">バックテスト</p>
          <p className="mt-1 text-sm text-muted">テンプレート戦略の簡易検証</p>
        </Link>
      </section>
    </AppShell>
  );
}
