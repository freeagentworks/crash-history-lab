import { Suspense } from "react";
import { AppShell } from "../../components/app-shell";
import { CompareLive } from "../../components/compare-live";
import { getDictionary } from "../../lib/i18n";

const dictionary = getDictionary("ja");

export default function ComparePage() {
  return (
    <AppShell
      title={dictionary.pages.compare.title}
      subtitle={dictionary.pages.compare.subtitle}
    >
      <Suspense
        fallback={
          <section className="glass-card p-4 text-sm text-muted">{dictionary.pages.compare.loading}</section>
        }
      >
        <CompareLive />
      </Suspense>
    </AppShell>
  );
}
