"use client";

import { useMemo, useState } from "react";
import { defaultIndicatorParams } from "../lib/analytics/config";
import type { IndicatorParams } from "../lib/analytics/types";

const SETTINGS_KEY = "crash-history-lab.settings.v1";

type UiSettings = {
  defaultRange: string;
  preDays: number;
  postDays: number;
  defaultMode: "score" | "single";
  threshold: number;
  coolingDays: number;
  indicators: IndicatorParams;
};

type RowDef = {
  name: string;
  value: number;
  update: (value: number) => void;
};

const defaultSettings: UiSettings = {
  defaultRange: "10y",
  preDays: 10,
  postDays: 50,
  defaultMode: "score",
  threshold: 70,
  coolingDays: 10,
  indicators: defaultIndicatorParams,
};

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeSettings(partial: Partial<UiSettings>): UiSettings {
  return {
    ...defaultSettings,
    ...partial,
    indicators: {
      ...defaultIndicatorParams,
      ...partial.indicators,
      zScore: {
        ...defaultIndicatorParams.zScore,
        ...partial.indicators?.zScore,
      },
      rsi: {
        ...defaultIndicatorParams.rsi,
        ...partial.indicators?.rsi,
      },
      crsi: {
        ...defaultIndicatorParams.crsi,
        ...partial.indicators?.crsi,
      },
      drawdown: {
        ...defaultIndicatorParams.drawdown,
        ...partial.indicators?.drawdown,
      },
      drawdownSpeed: {
        ...defaultIndicatorParams.drawdownSpeed,
        ...partial.indicators?.drawdownSpeed,
      },
      atr: {
        ...defaultIndicatorParams.atr,
        ...partial.indicators?.atr,
      },
      volumeShock: {
        ...defaultIndicatorParams.volumeShock,
        ...partial.indicators?.volumeShock,
      },
      ma200: {
        ...defaultIndicatorParams.ma200,
        ...partial.indicators?.ma200,
      },
      gapDown: {
        ...defaultIndicatorParams.gapDown,
        ...partial.indicators?.gapDown,
      },
      low52w: {
        ...defaultIndicatorParams.low52w,
        ...partial.indicators?.low52w,
      },
      breadth: {
        ...defaultIndicatorParams.breadth,
        ...partial.indicators?.breadth,
      },
    },
  };
}

function readInitialSettings(): UiSettings {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return mergeSettings(parsed);
  } catch {
    return defaultSettings;
  }
}

export function SettingsLive() {
  const [settings, setSettings] = useState<UiSettings>(readInitialSettings);
  const [message, setMessage] = useState("");

  const rows = useMemo<RowDef[]>(
    () => [
      {
        name: "Z値 window",
        value: settings.indicators.zScore.window,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: { ...prev.indicators, zScore: { ...prev.indicators.zScore, window: v } },
          })),
      },
      {
        name: "RSI window",
        value: settings.indicators.rsi.window,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: { ...prev.indicators, rsi: { ...prev.indicators.rsi, window: v } },
          })),
      },
      {
        name: "CRSI rsiWindow",
        value: settings.indicators.crsi.rsiWindow,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: { ...prev.indicators, crsi: { ...prev.indicators.crsi, rsiWindow: v } },
          })),
      },
      {
        name: "CRSI streakWindow",
        value: settings.indicators.crsi.streakWindow,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              crsi: { ...prev.indicators.crsi, streakWindow: v },
            },
          })),
      },
      {
        name: "CRSI rankWindow",
        value: settings.indicators.crsi.rankWindow,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: { ...prev.indicators, crsi: { ...prev.indicators.crsi, rankWindow: v } },
          })),
      },
      {
        name: "ドローダウン lookback",
        value: settings.indicators.drawdown.lookback,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              drawdown: { ...prev.indicators.drawdown, lookback: v },
            },
          })),
      },
      {
        name: "DD速度 5d",
        value: settings.indicators.drawdownSpeed.window1,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              drawdownSpeed: { ...prev.indicators.drawdownSpeed, window1: v },
            },
          })),
      },
      {
        name: "DD速度 10d",
        value: settings.indicators.drawdownSpeed.window2,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              drawdownSpeed: { ...prev.indicators.drawdownSpeed, window2: v },
            },
          })),
      },
      {
        name: "ATR window",
        value: settings.indicators.atr.window,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: { ...prev.indicators, atr: { ...prev.indicators.atr, window: v } },
          })),
      },
      {
        name: "出来高ショック window",
        value: settings.indicators.volumeShock.window,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              volumeShock: { ...prev.indicators.volumeShock, window: v },
            },
          })),
      },
      {
        name: "200日線 slope lookback",
        value: settings.indicators.ma200.slopeLookback,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              ma200: { ...prev.indicators.ma200, slopeLookback: v },
            },
          })),
      },
      {
        name: "ギャップ閾値(%)",
        value: settings.indicators.gapDown.thresholdPct,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              gapDown: { ...prev.indicators.gapDown, thresholdPct: v },
            },
          })),
      },
      {
        name: "52週安値 window",
        value: settings.indicators.low52w.window,
        update: (v) =>
          setSettings((prev) => ({
            ...prev,
            indicators: {
              ...prev.indicators,
              low52w: { ...prev.indicators.low52w, window: v },
            },
          })),
      },
    ],
    [settings],
  );

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("設定を保存しました。次の画面連携フェーズで全ページ共通適用します。");
  }

  function reset() {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
    setMessage("設定を初期化しました。");
  }

  return (
    <>
      <section className="glass-card p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold">表示設定</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted">初期取得期間</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={settings.defaultRange}
              onChange={(e) => setSettings((prev) => ({ ...prev, defaultRange: e.target.value }))}
            >
              <option value="10y">10年（デフォルト）</option>
              <option value="max">全期間</option>
              <option value="5y">5年</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted">前日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={settings.preDays}
              onChange={(e) => setSettings((prev) => ({ ...prev, preDays: toNumber(e.target.value) }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">後日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={settings.postDays}
              onChange={(e) => setSettings((prev) => ({ ...prev, postDays: toNumber(e.target.value) }))}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted">初期モード</span>
            <select
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={settings.defaultMode}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultMode: e.target.value as "score" | "single",
                }))
              }
            >
              <option value="score">スコア方式</option>
              <option value="single">単一条件</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted">閾値(score)</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={settings.threshold}
              onChange={(e) => setSettings((prev) => ({ ...prev, threshold: toNumber(e.target.value) }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted">クーリング日数</span>
            <input
              className="w-full rounded-xl border border-line bg-panel px-3 py-2"
              type="number"
              value={settings.coolingDays}
              onChange={(e) => setSettings((prev) => ({ ...prev, coolingDays: toNumber(e.target.value) }))}
            />
          </label>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-line px-4 py-3 md:px-5">
          <h2 className="font-display text-lg font-semibold">指標パラメータ</h2>
        </div>
        <div className="grid gap-2 p-4 md:grid-cols-2 md:p-5">
          {rows.map((row) => (
            <label key={row.name} className="space-y-1 text-sm">
              <span className="text-muted">{row.name}</span>
              <input
                className="w-full rounded-xl border border-line bg-panel px-3 py-2"
                value={row.value}
                onChange={(e) => row.update(toNumber(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={save} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            設定を保存
          </button>
          <button onClick={reset} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">
            初期化
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      </section>
    </>
  );
}
