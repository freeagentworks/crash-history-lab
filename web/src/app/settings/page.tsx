import { AppShell } from "../../components/app-shell";
import { SettingsLive } from "../../components/settings-live";

export default function SettingsPage() {
  return (
    <AppShell
      title="設定"
      subtitle="一般的パラメータを初期値にしつつ、全指標を編集可能にします。"
    >
      <SettingsLive />
    </AppShell>
  );
}
