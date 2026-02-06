import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { LiveDashboard } from "../components/live-dashboard";
import { getDictionary } from "../lib/i18n";

const dictionary = getDictionary("ja");

export default function HomePage() {
  return (
    <AppShell
      title={dictionary.pages.home.title}
      subtitle={dictionary.pages.home.subtitle}
    >
      <LiveDashboard />

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/compare" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">{dictionary.pages.home.compareTitle}</p>
          <p className="mt-1 text-sm text-muted">{dictionary.pages.home.compareSubtitle}</p>
        </Link>
        <Link href="/similar" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">{dictionary.pages.home.similarTitle}</p>
          <p className="mt-1 text-sm text-muted">{dictionary.pages.home.similarSubtitle}</p>
        </Link>
        <Link href="/backtest" className="glass-card p-4 hover:border-accent">
          <p className="font-display text-lg font-semibold">{dictionary.pages.home.backtestTitle}</p>
          <p className="mt-1 text-sm text-muted">{dictionary.pages.home.backtestSubtitle}</p>
        </Link>
      </section>
    </AppShell>
  );
}
