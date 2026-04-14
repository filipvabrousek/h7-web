"use client";

import { useState } from "react";
import { Heart, BarChart3, Wind, Flame, LucideIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n";
import { LEVELS, colorForLevel, textColorForLevel, bgForLevel } from "@/lib/level-engine";

const ACCENT = "#063A72"; // H7 Navy — matches onboarding profile form
const ACCENT_DARK = "#2673D9"; // BeltBlue — used for dark-mode accents

interface TutorialPage {
  icon: LucideIcon;
  iconTintLight: string;
  iconTintDark: string;
  iconBg: string; // tinted fill with alpha
  titleKey: TKey;
  subtitleKey: TKey;
  bodyKey: TKey;
  highlightKey?: TKey;
  showLevelPreview?: boolean;
}

const PAGES: TutorialPage[] = [
  {
    icon: Heart,
    iconTintLight: "#E53935",
    iconTintDark: "#FF6B6B",
    iconBg: "rgba(229,57,53,0.12)",
    titleKey: "tutorial.welcome.title",
    subtitleKey: "tutorial.welcome.subtitle",
    bodyKey: "tutorial.welcome.body",
  },
  {
    icon: BarChart3,
    iconTintLight: ACCENT,
    iconTintDark: ACCENT_DARK,
    iconBg: "rgba(38,115,217,0.12)",
    titleKey: "tutorial.levels.title",
    subtitleKey: "tutorial.levels.subtitle",
    bodyKey: "tutorial.levels.body",
    highlightKey: "tutorial.levels.highlight",
    showLevelPreview: true,
  },
  {
    icon: Wind,
    iconTintLight: "#2E7D32",
    iconTintDark: "#4CAF50",
    iconBg: "rgba(46,125,50,0.12)",
    titleKey: "tutorial.whatCounts.title",
    subtitleKey: "tutorial.whatCounts.subtitle",
    bodyKey: "tutorial.whatCounts.body",
    highlightKey: "tutorial.whatCounts.highlight",
  },
  {
    icon: Flame,
    iconTintLight: "#EF6C00",
    iconTintDark: "#FF9800",
    iconBg: "rgba(239,108,0,0.12)",
    titleKey: "tutorial.howItWorks.title",
    subtitleKey: "tutorial.howItWorks.subtitle",
    bodyKey: "tutorial.howItWorks.body",
    highlightKey: "tutorial.howItWorks.highlight",
  },
];

function LevelPreview() {
  const t = useT();
  const levels = LEVELS.filter((l) => l.value >= 1 && l.value <= 7);

  return (
    <div className="mt-3 space-y-1.5">
      {levels.map((level) => {
        const bg = bgForLevel(level.value);
        const circle = colorForLevel(level.value);
        const circleText = textColorForLevel(level.value);

        return (
          <div
            key={level.value}
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5"
            style={{ backgroundColor: bg }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shrink-0"
              style={{ backgroundColor: circle, color: circleText }}
            >
              H{level.value}
            </div>
            <span className="flex-1 text-[13px] font-medium text-gray-900">
              {level.beltName}
            </span>
            <span className="text-xs font-semibold text-gray-600 shrink-0">
              {t("tutorial.minPerDay").replace("{n}", String(level.dailyMinutes))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  onComplete: () => void;
}

export default function WelcomeTutorial({ onComplete }: Props) {
  const t = useT();
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const Icon = current.icon;
  const isLast = page === PAGES.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-4 pt-safe pb-safe">
      {/* Skip */}
      <div className="flex justify-end pt-3 pr-2">
        <button
          onClick={onComplete}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2"
        >
          {t("tutorial.skip")}
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center px-2 overflow-y-auto">
        <div className="w-full max-w-md mx-auto flex flex-col items-center pt-6">
          {/* Icon tile */}
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: current.iconBg }}
          >
            <Icon
              size={44}
              className="text-[color:var(--tint-light)] dark:text-[color:var(--tint-dark)]"
              style={
                {
                  "--tint-light": current.iconTintLight,
                  "--tint-dark": current.iconTintDark,
                } as React.CSSProperties
              }
            />
          </div>

          <h1 className="text-[26px] font-bold text-center leading-tight">
            {t(current.titleKey)}
          </h1>
          <p className="mt-2 text-base font-medium text-center text-gray-500 dark:text-gray-400">
            {t(current.subtitleKey)}
          </p>

          <p className="mt-4 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-left w-full">
            {t(current.bodyKey)}
          </p>

          {current.highlightKey && (
            <div
              className="mt-3 w-full rounded-xl p-4 text-sm font-semibold text-center"
              style={{
                backgroundColor: "rgba(6,58,114,0.08)",
                color: ACCENT,
              }}
            >
              {t(current.highlightKey)}
            </div>
          )}

          {current.showLevelPreview && <LevelPreview />}

          <div className="h-6" />
        </div>
      </div>

      {/* Dots + CTA */}
      <div className="pt-4 pb-6 flex flex-col items-center gap-5">
        <div className="flex gap-2">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === page ? 20 : 8,
                backgroundColor:
                  i === page ? ACCENT : "rgba(107,114,128,0.35)",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (isLast) onComplete();
            else setPage(page + 1);
          }}
          className="w-full max-w-md mx-4 py-3.5 rounded-2xl font-bold text-base text-white transition hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: ACCENT }}
        >
          {isLast ? t("tutorial.getStarted") : t("tutorial.next")}
        </button>
      </div>
    </div>
  );
}
