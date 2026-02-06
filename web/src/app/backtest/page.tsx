import { AppShell } from "../../components/app-shell";
import { BacktestLive } from "../../components/backtest-live";

export default function BacktestPage() {
  return (
    <AppShell
      title="バックテスト（テンプレート方式）"
      subtitle="逆張りリバウンドと200日線回復順張りを初期テンプレートとして検証します。"
    >
      <BacktestLive />
    </AppShell>
  );
}
