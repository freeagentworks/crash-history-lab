import { AppShell } from "../../components/app-shell";
import { SimilarLive } from "../../components/similar-live";

export default function SimilarPage() {
  return (
    <AppShell
      title="類似局面検索"
      subtitle="同一銘柄内を初期対象として、特徴量類似 + DTW再ランキングで候補を提示します。"
    >
      <SimilarLive />
    </AppShell>
  );
}
