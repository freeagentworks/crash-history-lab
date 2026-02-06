import { AppShell } from "../../components/app-shell";
import { SimilarLive } from "../../components/similar-live";
import { getDictionary } from "../../lib/i18n";

const dictionary = getDictionary("ja");

export default function SimilarPage() {
  return (
    <AppShell
      title={dictionary.pages.similar.title}
      subtitle={dictionary.pages.similar.subtitle}
    >
      <SimilarLive />
    </AppShell>
  );
}
