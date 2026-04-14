"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, useSignOut, useActivities, useWeekRecords } from "@/lib/hooks";
import { computeStatus } from "@/lib/level-engine";
import { profileCompletion, computeBMI, bmiCategory } from "@/lib/types";
import { WeeklyProgressChart } from "@/components/weekly-bar-chart";
import { LevelBadge } from "@/components/level-badge";
import {
  User, Watch, Bell, Globe, Lock, HelpCircle, LogOut, ChevronRight, X, ArrowUpRight, Check, Trash2, Camera, Sun, Moon, Monitor, Palette,
} from "lucide-react";
import { useI18n, type AppLanguage } from "@/lib/i18n";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { SupportChatModal } from "@/components/SupportChatModal";

export default function ProfilePage() {
  const { user, userId, updateUser } = useUser();
  const { activities } = useActivities(userId);
  const { records } = useWeekRecords(userId);
  const signOut = useSignOut();
  const { t, language, setLanguage } = useI18n();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [extendedStaircase, setExtendedStaircase] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking same file
    if (!file || !userId) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session");

      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Upload failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      await updateUser({ avatar_url: url });
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session");
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const languageDisplayKey: Record<AppLanguage, "language.system" | "language.english" | "language.czech" | "language.slovak"> = {
    system: "language.system",
    en: "language.english",
    cs: "language.czech",
    sk: "language.slovak",
  };

  const themeDisplayKey: Record<ThemeMode, "theme.system" | "theme.light" | "theme.dark"> = {
    system: "theme.system",
    light: "theme.light",
    dark: "theme.dark",
  };

  useEffect(() => {
    setExtendedStaircase(localStorage.getItem("h7_extended_staircase") === "true");
  }, []);

  if (!user) return null;

  const status = computeStatus(activities, records);
  const completion = profileCompletion(user);
  const bmi = computeBMI(user);

  const menuSections = [
    {
      title: t("profile.account"),
      items: [
        {
          icon: User, label: t("profile.personalInfo"),
          subtitle: [user.gender, bmi ? `BMI ${bmi.toFixed(1)}` : null].filter(Boolean).join(" · ") || undefined,
          onClick: () => setShowPersonalInfo(true),
        },
        { icon: Watch, label: t("profile.connectedDevices"), subtitle: t("profile.watchesApps"), onClick: undefined },
      ],
    },
    {
      title: t("profile.settings"),
      items: [
        { icon: Bell, label: t("profile.notifications"), subtitle: t("profile.alertsReminders"), onClick: undefined },
        { icon: Globe, label: t("profile.language"), subtitle: t(languageDisplayKey[language]), onClick: () => setShowLanguage(true) },
        { icon: Palette, label: t("profile.theme"), subtitle: t(themeDisplayKey[themeMode]), onClick: () => setShowTheme(true) },
      ],
    },
    {
      title: t("profile.other"),
      items: [
        { icon: Lock, label: t("profile.privacySecurity"), onClick: undefined, subtitle: undefined },
        { icon: HelpCircle, label: t("profile.helpSupport"), onClick: () => setShowSupportChat(true), subtitle: undefined },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("tab.profile")}</h1>

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden group"
          aria-label={t("profile.editAvatar")}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={32} className="text-gray-400" />
            </div>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"
            style={{ backgroundColor: "#063a72" }}
          >
            <Camera size={12} className="text-white" />
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
        <h2 className="text-lg font-bold">{user.username || t("profile.user")}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      {/* Weekly Progress Chart */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          <WeeklyProgressChart activities={activities} />
        </div>
      </div>

      {/* Menu sections */}
      {menuSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {section.title}
          </h3>
          {section.items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full bg-gray-100 dark:bg-[#242A2A] rounded-xl p-3 flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <item.icon size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{item.label}</div>
                {item.subtitle && (
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                )}
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </button>
          ))}
        </div>
      ))}

      {/* Extend Staircase */}
      <div className="bg-gray-100 dark:bg-[#242A2A] rounded-xl p-4">
        <button
          onClick={() => {
            const next = !extendedStaircase;
            setExtendedStaircase(next);
            localStorage.setItem("h7_extended_staircase", String(next));
          }}
          className="w-full flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#063a72" }}
          >
            <ArrowUpRight size={16} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{t("profile.extendStaircase")}</div>
            <div className="text-xs text-gray-500">{t("profile.extendDesc")}</div>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-md"
            style={
              extendedStaircase
                ? { backgroundColor: "#063a72", color: "#fff" }
                : { backgroundColor: "#E8EEF5", color: "#063a72" }
            }
          >
            {extendedStaircase ? t("profile.h14Extended") : t("profile.extendToH14")}
          </span>
        </button>
      </div>

      {/* Profile Completion */}
      <div className="bg-gray-100 dark:bg-[#242A2A] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">{t("profile.profileCompletion")}</span>
          <span className="text-xs font-bold text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-lg">
            {completion}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{t("profile.addMoreData")}</p>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition"
      >
        <LogOut size={16} /> {t("profile.signOut")}
      </button>

      {/* Delete account */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full py-3 rounded-xl text-xs text-gray-400 hover:text-red-500 transition flex items-center justify-center gap-2"
      >
        <Trash2 size={14} /> {t("profile.deleteAccount")}
      </button>

      {showDeleteConfirm && (
        <DeleteAccountModal
          deleting={deleting}
          error={deleteError}
          onConfirm={handleDeleteAccount}
          onClose={() => { if (!deleting) { setShowDeleteConfirm(false); setDeleteError(null); } }}
        />
      )}

      {/* Personal Info Modal */}
      {showPersonalInfo && (
        <PersonalInfoModal
          user={user}
          onSave={(updates) => { updateUser(updates); setShowPersonalInfo(false); }}
          onClose={() => setShowPersonalInfo(false)}
        />
      )}

      {/* Language Picker Modal */}
      {showLanguage && (
        <LanguagePickerModal
          current={language}
          onSelect={(lang) => { setLanguage(lang); setShowLanguage(false); }}
          onClose={() => setShowLanguage(false)}
        />
      )}

      {/* Theme Picker Modal */}
      {showTheme && (
        <ThemePickerModal
          current={themeMode}
          onSelect={(m) => { setThemeMode(m); setShowTheme(false); }}
          onClose={() => setShowTheme(false)}
        />
      )}

      {/* Support Chat Modal */}
      {showSupportChat && (
        <SupportChatModal onClose={() => setShowSupportChat(false)} />
      )}
    </div>
  );
}

function ThemePickerModal({
  current,
  onSelect,
  onClose,
}: {
  current: ThemeMode;
  onSelect: (mode: ThemeMode) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const options: { value: ThemeMode; labelKey: "theme.system" | "theme.light" | "theme.dark"; Icon: typeof Sun }[] = [
    { value: "system", labelKey: "theme.system", Icon: Monitor },
    { value: "light", labelKey: "theme.light", Icon: Sun },
    { value: "dark", labelKey: "theme.dark", Icon: Moon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{t("profile.theme")}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <opt.Icon size={18} className="text-blue-600" />
              <span className="flex-1 text-left text-sm font-medium">{t(opt.labelKey)}</span>
              {current === opt.value && <Check size={18} className="text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-500">{t("profile.deleteAccount")}</h2>
          <button onClick={onClose} disabled={deleting} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500">{t("profile.deleteConfirm")}</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#242A2A] text-sm font-medium disabled:opacity-40"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-60"
          >
            {deleting ? "..." : t("profile.deleteConfirmButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LanguagePickerModal({
  current,
  onSelect,
  onClose,
}: {
  current: AppLanguage;
  onSelect: (lang: AppLanguage) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const options: { value: AppLanguage; labelKey: "language.system" | "language.english" | "language.czech" | "language.slovak" }[] = [
    { value: "system", labelKey: "language.system" },
    { value: "en", labelKey: "language.english" },
    { value: "cs", labelKey: "language.czech" },
    { value: "sk", labelKey: "language.slovak" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{t("profile.language")}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <span className="text-sm font-medium">{t(opt.labelKey)}</span>
              {current === opt.value && <Check size={18} className="text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonalInfoModal({
  user,
  onSave,
  onClose,
}: {
  user: { username: string; gender: string | null; height_cm: number | null; weight_kg: number | null; country: string | null };
  onSave: (u: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [gender, setGender] = useState(user.gender || "male");
  const [height, setHeight] = useState(String(user.height_cm || ""));
  const [weight, setWeight] = useState(String(user.weight_kg || ""));
  const [country, setCountry] = useState(user.country || "");
  const { t } = useI18n();

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const bmi = h > 0 && w > 0 ? w / ((h / 100) ** 2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{t("personal.title")}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.username")}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 bg-gray-50 dark:bg-[#242A2A] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.gender")}</label>
            <div className="flex gap-2 mt-1">
              {(["male", "female", "other"] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    gender === g ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-[#242A2A]"
                  }`}>
                  {t(`personal.${g}` as const)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.height")}</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-[#242A2A] rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.weight")}</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-[#242A2A] rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>

          {bmi && (
            <div className="bg-gray-50 dark:bg-[#242A2A] rounded-lg p-3 text-center">
              <span className="text-sm font-bold">BMI: {bmi.toFixed(1)}</span>
              <span className="text-xs text-gray-500 ml-2">({bmiCategory(bmi)})</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">{t("personal.country")}</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)}
              placeholder={t("personal.countryOptional")}
              className="w-full mt-1 bg-gray-50 dark:bg-[#242A2A] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <button
          onClick={() => onSave({
            username,
            gender,
            height_cm: parseFloat(height) || null,
            weight_kg: parseFloat(weight) || null,
            country: country || null,
          })}
          className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
        >
          {t("personal.save")}
        </button>
      </div>
    </div>
  );
}
