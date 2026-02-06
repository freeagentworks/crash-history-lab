import { Suspense } from "react";
import { AppShell } from "../../components/app-shell";
import { EventsLive } from "../../components/events-live";
import { getDictionary } from "../../lib/i18n";

const dictionary = getDictionary("ja");

export default function EventsPage() {
  return (
    <AppShell
      title={dictionary.pages.events.title}
      subtitle={dictionary.pages.events.subtitle}
    >
      <Suspense
        fallback={
          <section className="glass-card p-4 text-sm text-muted">{dictionary.pages.events.loading}</section>
        }
      >
        <EventsLive />
      </Suspense>
    </AppShell>
  );
}
