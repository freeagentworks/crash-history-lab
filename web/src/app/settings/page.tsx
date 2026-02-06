import { AppShell } from "../../components/app-shell";
import { SettingsLive } from "../../components/settings-live";
import { getDictionary } from "../../lib/i18n";

const dictionary = getDictionary("ja");

export default function SettingsPage() {
  return (
    <AppShell
      title={dictionary.pages.settings.title}
      subtitle={dictionary.pages.settings.subtitle}
    >
      <SettingsLive />
    </AppShell>
  );
}
