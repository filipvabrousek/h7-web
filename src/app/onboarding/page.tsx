"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, ChevronLeft, Activity, Heart, Globe, Dumbbell } from "lucide-react";
import { useT } from "@/lib/i18n";
import WelcomeTutorial from "./welcome-tutorial";

type Step = 0 | 1 | 2 | 3;

const TUTORIAL_SEEN_KEY = "h7_tutorial_seen";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = 1900;
const MAX_BIRTH_YEAR = CURRENT_YEAR - 5; // disallow implausible future/very young sign-ups

export default function OnboardingPage() {
  const t = useT();
  const WEEKLY_OPTIONS = [
    { label: t("onboarding.weeklyLessThan1"), value: 30 },
    { label: t("onboarding.weekly1to3"), value: 120 },
    { label: t("onboarding.weekly3to5"), value: 240 },
    { label: t("onboarding.weekly5to7"), value: 360 },
    { label: t("onboarding.weekly7plus"), value: 480 },
  ];

  // Tutorial shown before the profile form. Dismissed either by completing all
  // 4 slides or tapping Skip. Persisted in localStorage so a hard refresh
  // mid-onboarding doesn't force the user to re-watch it.
  // `mounted` guard avoids SSR/client hydration mismatch when localStorage
  // says the tutorial was already seen.
  const [mounted, setMounted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(TUTORIAL_SEEN_KEY) === "1") {
      setShowTutorial(false);
    }
  }, []);

  const [step, setStep] = useState<Step>(0);
  const [gender, setGender] = useState<string | null>(null);
  const [birthYearInput, setBirthYearInput] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [country, setCountry] = useState("");
  const [weeklyActivity, setWeeklyActivity] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Render a neutral shell on the server + first paint so React's hydration
  // matches. The real choice between tutorial and form happens after mount.
  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-950" />;
  }

  if (showTutorial) {
    return (
      <WelcomeTutorial
        onComplete={() => {
          localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
          setShowTutorial(false);
        }}
      />
    );
  }

  const birthYearNum = (): number | null => {
    const n = parseInt(birthYearInput, 10);
    if (!Number.isFinite(n)) return null;
    if (n < MIN_BIRTH_YEAR || n > MAX_BIRTH_YEAR) return null;
    return n;
  };

  const canProceed = (): boolean => {
    if (step === 0) return gender !== null && birthYearNum() !== null;
    if (step === 1) return heightCm !== "" && weightKg !== "";
    if (step === 2) return weeklyActivity !== null;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        gender,
        birth_year: birthYearNum(),
        height_cm: parseFloat(heightCm) || null,
        weight_kg: parseFloat(weightKg) || null,
        country: country || null,
        initial_weekly_activity: weeklyActivity,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }
    window.location.href = "/app/";
  };

  const genderLabel = (g: "male" | "female" | "other"): string => {
    if (g === "male") return t("personal.male");
    if (g === "female") return t("personal.female");
    return t("personal.other");
  };

  const steps = [
    {
      icon: Heart,
      title: t("onboarding.aboutYou.title"),
      subtitle: t("onboarding.aboutYou.subtitle"),
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">{t("onboarding.genderLabel")}</label>
            <div className="flex gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                    gender === g
                      ? "bg-[#063A72] text-white"
                      : "bg-gray-100 dark:bg-[#242A2A] text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {genderLabel(g)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("onboarding.birthYearLabel")}</label>
            <input
              type="number"
              inputMode="numeric"
              value={birthYearInput}
              onChange={(e) => setBirthYearInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="1990"
              min={MIN_BIRTH_YEAR}
              max={MAX_BIRTH_YEAR}
              className="w-full mt-1 bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {birthYearInput !== "" && birthYearNum() === null && (
              <p className="mt-1 text-xs text-red-500">
                {t("onboarding.birthYearError")
                  .replace("{min}", String(MIN_BIRTH_YEAR))
                  .replace("{max}", String(MAX_BIRTH_YEAR))}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      icon: Activity,
      title: t("onboarding.body.title"),
      subtitle: t("onboarding.body.subtitle"),
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.height")}</label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="175"
              className="w-full mt-1 bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.weight")}</label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="70"
              className="w-full mt-1 bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ),
    },
    {
      icon: Dumbbell,
      title: t("onboarding.activity.title"),
      subtitle: t("onboarding.activity.subtitle"),
      content: (
        <div className="space-y-2">
          {WEEKLY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWeeklyActivity(opt.value)}
              className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-left transition ${
                weeklyActivity === opt.value
                  ? "bg-[#063A72] text-white"
                  : "bg-gray-100 dark:bg-[#242A2A] text-gray-700 dark:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Globe,
      title: t("onboarding.country.title"),
      subtitle: t("onboarding.country.subtitle"),
      content: (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.country")}</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Czech Republic"
            className="w-full mt-1 bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all ${
                i <= step ? "bg-[#063A72]" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#063A72]">
            <Icon size={24} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold">{current.title}</h1>
          <p className="text-sm text-gray-500">{current.subtitle}</p>
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">{current.content}</div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="py-3 px-5 rounded-xl bg-gray-100 dark:bg-[#242A2A] text-sm font-medium flex items-center gap-1"
            >
              <ChevronLeft size={16} /> {t("onboarding.back")}
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) handleFinish();
              else setStep((step + 1) as Step);
            }}
            disabled={!canProceed() || saving}
            className="flex-1 py-3 rounded-xl bg-[#063A72] text-white font-bold text-sm hover:bg-[#0D4F8C] transition disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {saving ? "..." : isLast ? t("tutorial.getStarted") : t("onboarding.continue")}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={handleFinish}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition"
          >
            {t("onboarding.skip")}
          </button>
        )}
      </div>
    </div>
  );
}
