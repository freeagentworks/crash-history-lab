import { Suspense } from "react";
import { AppShell } from "../../components/app-shell";
import { EventsLive } from "../../components/events-live";

export default function EventsPage() {
  return (
    <AppShell
      title="暴落イベント一覧"
      subtitle="単一条件/スコア方式で抽出したイベントを比較用に選択します。"
    >
      <Suspense
        fallback={
          <section className="glass-card p-4 text-sm text-muted">イベント一覧を読み込み中です...</section>
        }
      >
        <EventsLive />
      </Suspense>
    </AppShell>
  );
}
