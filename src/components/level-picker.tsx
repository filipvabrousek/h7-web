"use client";

import { useState } from "react";
import { Clock, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Level data                                                         */
/* ------------------------------------------------------------------ */

interface PickerLevel {
  value: number;
  display: string;       // "H0" … "H8+"
  name: { cs: string; en: string };
  weeklyHours: string;   // "0h" … "8+h"
  dailyRange: { cs: string; en: string };
  description: { cs: string; en: string };
}

const PICKER_LEVELS: PickerLevel[] = [
  {
    value: 0, display: "H0",
    name: { cs: "Bez pohybu", en: "No Activity" },
    weeklyHours: "0h",
    dailyRange: { cs: "0 min denně", en: "0 min daily" },
    description: {
      cs: "Sedavý životní styl bez pravidelného pohybu. Každá minuta navíc se počítá — začněte třeba 5minutovou procházkou.",
      en: "Sedentary lifestyle with no regular activity. Every minute counts — start with a 5-minute walk.",
    },
  },
  {
    value: 1, display: "H1",
    name: { cs: "Začátek", en: "Getting Started" },
    weeklyHours: "1h",
    dailyRange: { cs: "8–9 min denně", en: "8–9 min daily" },
    description: {
      cs: "První kroky k aktivnějšímu životu. 1 hodina týdně — krátká procházka nebo protažení každý den.",
      en: "First steps toward an active life. 1 hour per week — a short walk or stretch every day.",
    },
  },
  {
    value: 2, display: "H2",
    name: { cs: "Budování návyku", en: "Building Habit" },
    weeklyHours: "2h",
    dailyRange: { cs: "17–18 min denně", en: "17–18 min daily" },
    description: {
      cs: "Pohyb se stává součástí vašeho dne. 2 hodiny týdně budují základ pro silnější návyk.",
      en: "Movement becomes part of your day. 2 hours per week builds the foundation for a stronger habit.",
    },
  },
  {
    value: 3, display: "H3",
    name: { cs: "Součást života", en: "Part of Life" },
    weeklyHours: "3h",
    dailyRange: { cs: "25–26 min denně", en: "25–26 min daily" },
    description: {
      cs: "Pohyb se stává součástí vašeho života. 3 hodiny týdně vědomé aktivity. Začínáte cítit zlepšení kondice a nálady. Pravidelný rytmus 3–4× týdně.",
      en: "Movement becomes part of your life. 3 hours of intentional activity weekly. You start feeling improvements in fitness and mood.",
    },
  },
  {
    value: 4, display: "H4",
    name: { cs: "Nadprůměr", en: "Above Average" },
    weeklyHours: "4h",
    dailyRange: { cs: "34–35 min denně", en: "34–35 min daily" },
    description: {
      cs: "Jste nad průměrem populace. 4 hodiny týdně přináší výrazné zdravotní benefity a viditelné výsledky.",
      en: "You're above the population average. 4 hours weekly brings significant health benefits and visible results.",
    },
  },
  {
    value: 5, display: "H5",
    name: { cs: "Sportovec", en: "Athlete" },
    weeklyHours: "5h",
    dailyRange: { cs: "42–43 min denně", en: "42–43 min daily" },
    description: {
      cs: "Aktivní sportovní životní styl. 5 hodin týdně — trénujete pravidelně a pohyb je vaše priorita.",
      en: "Active sports lifestyle. 5 hours weekly — you train regularly and movement is your priority.",
    },
  },
  {
    value: 6, display: "H6",
    name: { cs: "Pokročilý", en: "Advanced" },
    weeklyHours: "6h",
    dailyRange: { cs: "51–52 min denně", en: "51–52 min daily" },
    description: {
      cs: "Pokročilá úroveň aktivity. 6 hodin týdně intenzivního pohybu vyžaduje disciplínu a odhodlání.",
      en: "Advanced activity level. 6 hours of intense weekly movement requires discipline and determination.",
    },
  },
  {
    value: 7, display: "H7",
    name: { cs: "Mistr", en: "Master" },
    weeklyHours: "7h",
    dailyRange: { cs: "60 min denně", en: "60 min daily" },
    description: {
      cs: "Cíl H7 — hodina pohybu denně, 7 hodin týdně. Dosáhli jste zlatého standardu aktivního života.",
      en: "The H7 goal — one hour of movement daily, 7 hours per week. You've reached the gold standard of an active life.",
    },
  },
  {
    value: 8, display: "H8+",
    name: { cs: "Extrém", en: "Extreme" },
    weeklyHours: "8+h",
    dailyRange: { cs: "69+ min denně", en: "69+ min daily" },
    description: {
      cs: "Extrémní úroveň aktivity. Více než 8 hodin týdně — pro profesionální sportovce a nadšence.",
      en: "Extreme activity level. Over 8 hours per week — for professional athletes and enthusiasts.",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PRIMARY = "#063A72";
const GRAY_400 = "#9CA3AF";
const GRAY_200 = "#E5E7EB";

interface LevelPickerProps {
  /** Currently selected level value (0-8). Default 3 */
  value?: number;
  /** Called when user taps a level */
  onChange?: (level: number) => void;
  /** Language */
  lang?: "cs" | "en";
  /** Show the section title */
  showTitle?: boolean;
}

export default function LevelPicker({
  value: controlledValue,
  onChange,
  lang = "cs",
  showTitle = true,
}: LevelPickerProps) {
  const [internalValue, setInternalValue] = useState(3);
  const selected = controlledValue ?? internalValue;

  const handleSelect = (v: number) => {
    setInternalValue(v);
    onChange?.(v);
  };

  const level = PICKER_LEVELS.find((l) => l.value === selected) ?? PICKER_LEVELS[3];

  return (
    <section className="w-full max-w-3xl mx-auto px-4">
      {/* Title */}
      {showTitle && (
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {lang === "cs" ? "Systém úrovní H0–H8+" : "Level System H0–H8+"}
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            {lang === "cs"
              ? "Kde se právě nacházíte? Každá úroveň odpovídá jiné časové dotaci pohybu za týden."
              : "Where are you? Each level corresponds to a different weekly time allocation of movement."}
          </p>
        </div>
      )}

      {/* Timeline picker */}
      <div className="relative flex items-start justify-between select-none">
        {/* Horizontal line behind circles */}
        <div
          className="absolute left-0 right-0 h-[2px] bg-gray-200 dark:bg-gray-700"
          style={{ top: 20 }}
        />
        {/* Filled portion of line */}
        <div
          className="absolute left-0 h-[2px] transition-all duration-300"
          style={{
            top: 20,
            width: `${(selected / (PICKER_LEVELS.length - 1)) * 100}%`,
            background: PRIMARY,
          }}
        />

        {PICKER_LEVELS.map((l) => {
          const isSelected = l.value === selected;
          const isPast = l.value < selected;

          return (
            <button
              key={l.value}
              onClick={() => handleSelect(l.value)}
              className="relative flex flex-col items-center z-10 group focus:outline-none"
              style={{ flex: "1 1 0%", minWidth: 0 }}
            >
              {/* Circle */}
              <div
                className="rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 shrink-0"
                style={{
                  width: isSelected ? 44 : 28,
                  height: isSelected ? 44 : 28,
                  marginTop: isSelected ? -2 : 6,
                  backgroundColor: isSelected || isPast ? PRIMARY : "white",
                  borderColor: isSelected || isPast ? PRIMARY : GRAY_200,
                  color: isSelected || isPast ? "white" : GRAY_400,
                  fontSize: isSelected ? 14 : 10,
                }}
              >
                {l.display}
              </div>

              {/* Label */}
              <span
                className="mt-1.5 font-semibold uppercase leading-tight text-center transition-colors duration-200"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.02em",
                  color: isSelected ? PRIMARY : isPast ? "#4B5563" : GRAY_400,
                  maxWidth: 72,
                }}
              >
                {l.name[lang]}
              </span>
              <span
                className="text-center"
                style={{
                  fontSize: 8,
                  color: isSelected ? PRIMARY : GRAY_400,
                  marginTop: 1,
                }}
              >
                {l.weeklyHours} {lang === "cs" ? "týdně" : "weekly"}
              </span>

              {/* Diamond indicator */}
              {isSelected && (
                <div
                  className="mt-1.5 transition-all duration-300"
                  style={{
                    width: 8,
                    height: 8,
                    background: PRIMARY,
                    transform: "rotate(45deg)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Detail card */}
      <div className="mt-8 bg-white dark:bg-[#1A1F1F] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-all duration-300">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Left: badge + name */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
              style={{
                width: 40,
                height: 40,
                backgroundColor: PRIMARY,
                fontSize: 14,
              }}
            >
              {level.display}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {level.name[lang]}
            </h3>
          </div>

          {/* Right: stats */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              <div>
                <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {level.weeklyHours} {lang === "cs" ? "týdně" : "weekly"}
                </div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {lang === "cs" ? "Týdně" : "Weekly"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-gray-400" />
              <div>
                <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {level.dailyRange[lang]}
                </div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {lang === "cs" ? "Denně" : "Daily"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          {level.description[lang]}
        </p>
      </div>
    </section>
  );
}

export { PICKER_LEVELS };
export type { PickerLevel };
