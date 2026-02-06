"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "ダッシュボード" },
  { href: "/events", label: "イベント" },
  { href: "/compare", label: "比較" },
  { href: "/similar", label: "類似検索" },
  { href: "/backtest", label: "バックテスト" },
  { href: "/settings", label: "設定" },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="pb-8 pt-6 md:pt-10">
      <div className="app-shell space-y-5 md:space-y-6">
        <header className="glass-card p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold tracking-wide text-accent">
                CRASH HISTORY LAB
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {title}
              </h1>
              <p className="text-sm text-muted md:text-base">{subtitle}</p>
            </div>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
              <div className="glass-card px-3 py-2">
                <p className="text-xs uppercase tracking-wide">取得対象</p>
                <p className="font-mono font-semibold text-foreground">Yahoo Finance / Daily</p>
              </div>
              <div className="glass-card px-3 py-2">
                <p className="text-xs uppercase tracking-wide">モード</p>
                <p className="font-semibold text-foreground">研究・教育</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2 md:mt-5">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full border border-line px-3 py-1.5 text-sm transition hover:border-accent hover:text-accent ${
                    active ? "nav-link-active border-accent/30" : "bg-panel"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="space-y-5">{children}</main>

        <footer className="glass-card p-4 text-xs leading-relaxed text-muted md:text-sm">
          本アプリは研究・教育目的の情報ツールです。特定銘柄の売買推奨や投資助言を目的としません。
          投資判断はご自身の責任で行ってください。
        </footer>
      </div>
    </div>
  );
}
