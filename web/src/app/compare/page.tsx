import { Suspense } from "react";
import { AppShell } from "../../components/app-shell";
import { CompareLive } from "../../components/compare-live";

export default function ComparePage() {
  return (
    <AppShell
      title="イベント比較（最大4件）"
      subtitle="イベント日を基準に、価格推移と主要指標を同一スケールで比較します。"
    >
      <Suspense
        fallback={
          <section className="glass-card p-4 text-sm text-muted">比較ビューを読み込み中です...</section>
        }
      >
        <CompareLive />
      </Suspense>
    </AppShell>
  );
}
