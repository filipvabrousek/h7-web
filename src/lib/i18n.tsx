"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type AppLanguage = "system" | "en" | "cs" | "sk";

const STORAGE_KEY = "h7_app_language";

// ---- Dictionaries ----------------------------------------------------------

const en = {
  "language.english": "English",
  "language.czech": "Czech",
  "language.slovak": "Slovak",
  "language.system": "System default",
  "tab.profile": "Profile",
  "profile.user": "User",
  "profile.account": "ACCOUNT",
  "profile.settings": "SETTINGS",
  "profile.other": "OTHER",
  "profile.personalInfo": "Personal Information",
  "profile.connectedDevices": "Connected Devices",
  "profile.watchesApps": "Watches & apps",
  "profile.notifications": "Notifications",
  "profile.alertsReminders": "Alerts & reminders",
  "profile.language": "Language",
  "profile.privacySecurity": "Privacy & Security",
  "profile.helpSupport": "Help & Support",
  "profile.signOut": "Sign Out",
  "profile.profileCompletion": "Profile Completion",
  "profile.addMoreData": "Add more data to complete your profile",
  "profile.extendStaircase": "Extend my H-staircase",
  "profile.extendDesc": "Unlock levels H8 through H14",
  "profile.h14Extended": "H14 Extended ✓",
  "profile.extendToH14": "Extend to H14",
  "personal.title": "Personal Information",
  "personal.username": "Username",
  "personal.gender": "Gender",
  "personal.male": "Male",
  "personal.female": "Female",
  "personal.other": "Other",
  "personal.height": "Height (cm)",
  "personal.weight": "Weight (kg)",
  "personal.country": "Country",
  "personal.countryOptional": "Optional",
  "personal.save": "Save",
  "common.back": "Back",
  "common.cancel": "Cancel",
  "profile.deleteAccount": "Delete Account",
  "profile.deleteConfirm": "This will permanently delete your account and all your data. This cannot be undone.",
  "profile.deleteConfirmButton": "Delete forever",
  "profile.editAvatar": "Change avatar",
  "profile.theme": "Theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
} as const;

type Dict = Record<keyof typeof en, string>;

const cs: Dict = {
  "language.english": "Angličtina",
  "language.czech": "Čeština",
  "language.slovak": "Slovenština",
  "language.system": "Podle systému",
  "tab.profile": "Profil",
  "profile.user": "Uživatel",
  "profile.account": "ÚČET",
  "profile.settings": "NASTAVENÍ",
  "profile.other": "OSTATNÍ",
  "profile.personalInfo": "Osobní údaje",
  "profile.connectedDevices": "Připojená zařízení",
  "profile.watchesApps": "Hodinky a aplikace",
  "profile.notifications": "Oznámení",
  "profile.alertsReminders": "Upozornění a připomínky",
  "profile.language": "Jazyk",
  "profile.privacySecurity": "Soukromí a zabezpečení",
  "profile.helpSupport": "Nápověda a podpora",
  "profile.signOut": "Odhlásit se",
  "profile.profileCompletion": "Dokončení profilu",
  "profile.addMoreData": "Doplňte další údaje pro dokončení profilu",
  "profile.extendStaircase": "Rozšířit moje H-schodiště",
  "profile.extendDesc": "Odemkněte úrovně H8 až H14",
  "profile.h14Extended": "H14 rozšířeno ✓",
  "profile.extendToH14": "Rozšířit na H14",
  "personal.title": "Osobní údaje",
  "personal.username": "Uživatelské jméno",
  "personal.gender": "Pohlaví",
  "personal.male": "Muž",
  "personal.female": "Žena",
  "personal.other": "Jiné",
  "personal.height": "Výška (cm)",
  "personal.weight": "Váha (kg)",
  "personal.country": "Země",
  "personal.countryOptional": "Volitelné",
  "personal.save": "Uložit",
  "common.back": "Zpět",
  "common.cancel": "Zrušit",
  "profile.deleteAccount": "Smazat účet",
  "profile.deleteConfirm": "Tímto trvale smažete svůj účet i všechna data. Nelze vrátit zpět.",
  "profile.deleteConfirmButton": "Smazat navždy",
  "profile.editAvatar": "Změnit avatar",
  "profile.theme": "Vzhled",
  "theme.system": "Podle systému",
  "theme.light": "Světlý",
  "theme.dark": "Tmavý",
};

const sk: Dict = {
  "language.english": "Angličtina",
  "language.czech": "Čeština",
  "language.slovak": "Slovenčina",
  "language.system": "Podľa systému",
  "tab.profile": "Profil",
  "profile.user": "Používateľ",
  "profile.account": "ÚČET",
  "profile.settings": "NASTAVENIA",
  "profile.other": "OSTATNÉ",
  "profile.personalInfo": "Osobné údaje",
  "profile.connectedDevices": "Pripojené zariadenia",
  "profile.watchesApps": "Hodinky a aplikácie",
  "profile.notifications": "Upozornenia",
  "profile.alertsReminders": "Upozornenia a pripomienky",
  "profile.language": "Jazyk",
  "profile.privacySecurity": "Súkromie a zabezpečenie",
  "profile.helpSupport": "Pomoc a podpora",
  "profile.signOut": "Odhlásiť sa",
  "profile.profileCompletion": "Dokončenie profilu",
  "profile.addMoreData": "Doplňte ďalšie údaje pre dokončenie profilu",
  "profile.extendStaircase": "Rozšíriť moje H-schodisko",
  "profile.extendDesc": "Odomknite úrovne H8 až H14",
  "profile.h14Extended": "H14 rozšírené ✓",
  "profile.extendToH14": "Rozšíriť na H14",
  "personal.title": "Osobné údaje",
  "personal.username": "Používateľské meno",
  "personal.gender": "Pohlavie",
  "personal.male": "Muž",
  "personal.female": "Žena",
  "personal.other": "Iné",
  "personal.height": "Výška (cm)",
  "personal.weight": "Váha (kg)",
  "personal.country": "Krajina",
  "personal.countryOptional": "Voliteľné",
  "personal.save": "Uložiť",
  "common.back": "Späť",
  "common.cancel": "Zrušiť",
  "profile.deleteAccount": "Zmazať účet",
  "profile.deleteConfirm": "Týmto natrvalo zmažete svoj účet i všetky údaje. Nedá sa vrátiť späť.",
  "profile.deleteConfirmButton": "Zmazať navždy",
  "profile.editAvatar": "Zmeniť avatar",
  "profile.theme": "Vzhľad",
  "theme.system": "Podľa systému",
  "theme.light": "Svetlý",
  "theme.dark": "Tmavý",
};

const dictionaries: Record<"en" | "cs" | "sk", Dict> = { en, cs, sk };

export type TKey = keyof typeof en;

// ---- Context ---------------------------------------------------------------

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveCode(language: AppLanguage): "en" | "cs" | "sk" {
  if (language !== "system") return language;
  if (typeof navigator === "undefined") return "en";
  const code = navigator.language.slice(0, 2).toLowerCase();
  if (code === "cs" || code === "sk") return code;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("system");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "en" || stored === "cs" || stored === "sk" || stored === "system") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    const code = resolveCode(language);
    const dict = dictionaries[code];
    return {
      language,
      setLanguage,
      t: (key: TKey) => dict[key] ?? en[key] ?? key,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
