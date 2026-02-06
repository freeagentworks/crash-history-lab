import { AppShell } from "../../components/app-shell";
import { EventsLive } from "../../components/events-live";

export default function EventsPage() {
  return (
    <AppShell
      title="暴落イベント一覧"
      subtitle="単一条件/スコア方式で抽出したイベントを比較用に選択します。"
    >
      <EventsLive />
    </AppShell>
  );
}
