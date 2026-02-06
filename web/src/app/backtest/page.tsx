import { AppShell } from "../../components/app-shell";
import { BacktestLive } from "../../components/backtest-live";
import { getDictionary } from "../../lib/i18n";

const dictionary = getDictionary("ja");

export default function BacktestPage() {
  return (
    <AppShell
      title={dictionary.pages.backtest.title}
      subtitle={dictionary.pages.backtest.subtitle}
    >
      <BacktestLive />
    </AppShell>
  );
}
