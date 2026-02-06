export type Locale = "ja" | "en";

export type Dictionary = {
  nav: {
    dashboard: string;
    events: string;
    compare: string;
    similar: string;
    backtest: string;
    settings: string;
  };
  shell: {
    badge: string;
    sourceLabel: string;
    sourceValue: string;
    modeLabel: string;
    modeValue: string;
    disclaimer: string;
  };
  pages: {
    home: {
      title: string;
      subtitle: string;
      compareTitle: string;
      compareSubtitle: string;
      similarTitle: string;
      similarSubtitle: string;
      backtestTitle: string;
      backtestSubtitle: string;
    };
    events: {
      title: string;
      subtitle: string;
      loading: string;
    };
    compare: {
      title: string;
      subtitle: string;
      loading: string;
    };
    similar: {
      title: string;
      subtitle: string;
    };
    backtest: {
      title: string;
      subtitle: string;
    };
    settings: {
      title: string;
      subtitle: string;
    };
  };
};

const ja: Dictionary = {
  nav: {
    dashboard: "ダッシュボード",
    events: "イベント",
    compare: "比較",
    similar: "類似検索",
    backtest: "バックテスト",
    settings: "設定",
  },
  shell: {
    badge: "CRASH HISTORY LAB",
    sourceLabel: "取得対象",
    sourceValue: "Yahoo Finance / Daily",
    modeLabel: "モード",
    modeValue: "研究・教育",
    disclaimer:
      "本アプリは研究・教育目的の情報ツールです。特定銘柄の売買推奨や投資助言を目的としません。投資判断はご自身の責任で行ってください。",
  },
  pages: {
    home: {
      title: "暴落イベント・ダッシュボード",
      subtitle: "実データを取得して暴落ランキングを生成し、イベント前後の挙動を確認します。",
      compareTitle: "比較ビュー",
      compareSubtitle: "最大4イベントを並列比較",
      similarTitle: "類似検索",
      similarSubtitle: "同一銘柄内の類似局面を探索",
      backtestTitle: "バックテスト",
      backtestSubtitle: "テンプレート戦略の簡易検証",
    },
    events: {
      title: "暴落イベント一覧",
      subtitle: "単一条件/スコア方式で抽出したイベントを比較用に選択します。",
      loading: "イベント一覧を読み込み中です...",
    },
    compare: {
      title: "イベント比較（最大4件）",
      subtitle: "イベント日を基準に、価格推移と主要指標を同一スケールで比較します。",
      loading: "比較ビューを読み込み中です...",
    },
    similar: {
      title: "類似局面検索",
      subtitle: "同一銘柄内を初期対象として、特徴量類似 + DTW再ランキングで候補を提示します。",
    },
    backtest: {
      title: "バックテスト（テンプレート方式）",
      subtitle: "逆張りリバウンドと200日線回復順張りを初期テンプレートとして検証します。",
    },
    settings: {
      title: "設定",
      subtitle: "一般的パラメータを初期値にしつつ、全指標を編集可能にします。",
    },
  },
};

const en: Dictionary = {
  nav: {
    dashboard: "Dashboard",
    events: "Events",
    compare: "Compare",
    similar: "Similarity",
    backtest: "Backtest",
    settings: "Settings",
  },
  shell: {
    badge: "CRASH HISTORY LAB",
    sourceLabel: "Data Source",
    sourceValue: "Yahoo Finance / Daily",
    modeLabel: "Mode",
    modeValue: "Research & Education",
    disclaimer:
      "This app is for research and educational use only. It does not provide investment advice. Make investment decisions at your own discretion.",
  },
  pages: {
    home: {
      title: "Crash Event Dashboard",
      subtitle: "Fetch market data, rank crash events, and inspect pre/post event behavior.",
      compareTitle: "Compare View",
      compareSubtitle: "Compare up to 4 events side by side",
      similarTitle: "Similarity Search",
      similarSubtitle: "Find similar regimes within the same symbol",
      backtestTitle: "Backtest",
      backtestSubtitle: "Quick validation with strategy templates",
    },
    events: {
      title: "Crash Events",
      subtitle: "Select events extracted by single-rule/score mode for comparison.",
      loading: "Loading events...",
    },
    compare: {
      title: "Event Comparison (Up to 4)",
      subtitle: "Align events by event date and compare price/indicator behaviors.",
      loading: "Loading comparison view...",
    },
    similar: {
      title: "Similarity Search",
      subtitle: "Default scope is same-symbol history with feature + DTW reranking.",
    },
    backtest: {
      title: "Backtest (Template Mode)",
      subtitle: "Validate with mean-rebound and 200-day reclaim templates.",
    },
    settings: {
      title: "Settings",
      subtitle: "Use common defaults and keep all indicators configurable.",
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = {
  ja,
  en,
};

export const defaultLocale: Locale = "ja";

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}
