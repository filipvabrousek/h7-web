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
  // Onboarding / tutorial
  "tutorial.skip": "Skip",
  "tutorial.next": "Next",
  "tutorial.getStarted": "Get Started",
  "tutorial.minPerDay": "{n} min/day",
  "tutorial.welcome.title": "Welcome to H7",
  "tutorial.welcome.subtitle": "Your path to a healthier life through regular movement",
  "tutorial.welcome.body": "H7 helps people who don't exercise regularly yet to find a simple, sustainable way to get moving. No gym required. No extreme workouts. Just consistent movement that makes your heart and lungs work.",
  "tutorial.levels.title": "7 Levels — 7 Judo Belts",
  "tutorial.levels.subtitle": "Start easy, progress at your own pace",
  "tutorial.levels.body": "From H1 (just 9 min/day) possibly all the way to H7 (60 min/day). Stay at each level for 3–8 weeks before moving up. There's no rush — even H3 is a huge plus for your health. More frequent activities are better than one big weekend bout.",
  "tutorial.levels.highlight": "H1 = 9 min/day · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "What Counts for H7?",
  "tutorial.whatCounts.subtitle": "Any activity that raises your heart rate",
  "tutorial.whatCounts.body": "Walking briskly, cycling, dancing, gardening, even intense housework — anything where you noticeably breathe faster and feel your heart rate rise. It doesn't have to be a sport, but leisurely strolling or sitting activities like chess or fishing don't count.",
  "tutorial.whatCounts.highlight": "The key: you should feel your breathing and heart rate increase.",
  "tutorial.howItWorks.title": "How It Works",
  "tutorial.howItWorks.subtitle": "Log, track, level up",
  "tutorial.howItWorks.body": "1. Log your activity after each session (or enable automatic import from your tracker).\n2. Watch your daily and weekly consistency grow.\n3. After 3+ weeks at each level, you earn protection — one bad week won't drop you.\n4. Level up when you're ready. Stay where you're comfortable.",
  "tutorial.howItWorks.highlight": "Your only goal: find YOUR sustainable level of movement and stay there.",
  // Profile form (onboarding steps)
  "onboarding.aboutYou.title": "About You",
  "onboarding.aboutYou.subtitle": "Help us personalize your experience",
  "onboarding.body.title": "Body Metrics",
  "onboarding.body.subtitle": "Used for BMI and activity recommendations",
  "onboarding.activity.title": "Activity Level",
  "onboarding.activity.subtitle": "How much do you exercise per week?",
  "onboarding.country.title": "Where Are You From?",
  "onboarding.country.subtitle": "Optional — helps us find people near you",
  "onboarding.genderLabel": "Gender",
  "onboarding.birthYearLabel": "Birth year",
  "onboarding.birthYearError": "Enter a year between {min} and {max}.",
  "onboarding.continue": "Continue",
  "onboarding.back": "Back",
  "onboarding.skip": "Skip for now",
  "onboarding.weeklyLessThan1": "Less than 1 hour",
  "onboarding.weekly1to3": "1–3 hours",
  "onboarding.weekly3to5": "3–5 hours",
  "onboarding.weekly5to7": "5–7 hours",
  "onboarding.weekly7plus": "7+ hours",
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
  "tutorial.skip": "Přeskočit",
  "tutorial.next": "Další",
  "tutorial.getStarted": "Začít",
  "tutorial.minPerDay": "{n} min/den",
  "tutorial.welcome.title": "Vítejte v H7",
  "tutorial.welcome.subtitle": "Vaše cesta ke zdravějšímu životu začíná zde",
  "tutorial.welcome.body": "H7 je jednoduchý systém, který vám pomůže vybudovat návyk pravidelného pohybu. Bez složitých tréninků, bez drahého vybavení — jen vy a vaše každodenní pohybová aktivita.\n\nCíl je jednoduchý: nasbírat každý týden dostatek aktivních minut k dosažení a udržení vaší cílové úrovně.",
  "tutorial.levels.title": "Systém úrovní H7",
  "tutorial.levels.subtitle": "7 úrovní, jako pásy v bojových uměních",
  "tutorial.levels.body": "Vaše úroveň H odráží týdenní konzistenci pohybu. Každá úroveň vyžaduje určitý počet aktivních minut denně v průměru.\n\nZačněte na H1 a postupujte výš s rostoucí kondicí.",
  "tutorial.levels.highlight": "H1 = 9 min/den · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "Co se počítá?",
  "tutorial.whatCounts.subtitle": "Téměř jakýkoli pohyb, který zrychlí váš tep",
  "tutorial.whatCounts.body": "Chůze, běh, cyklistika, plavání, jóga, tanec, sport, silový trénink, turistika — pokud vás to rozhýbe s vědomým úsilím, počítá se to.\n\nJediné pravidlo: aktivita musí být alespoň „vědomé\" intenzity — měli byste cítit, jak pracuje srdce a plíce.",
  "tutorial.whatCounts.highlight": "Klidná procházka se nepočítá, ale svižná ano!",
  "tutorial.howItWorks.title": "Jak to funguje",
  "tutorial.howItWorks.subtitle": "Zaznamenejte, sledujte, postupte výš",
  "tutorial.howItWorks.body": "1. Každý den zaznamenejte své aktivity — ručně nebo přes připojená zařízení.\n2. Sledujte svůj týdenní pokrok na přehledu.\n3. Po 3+ týdnech na úrovni získáte ochranu — jeden špatný týden vás neshodí.\n4. Postupte výš, až budete připraveni.",
  "tutorial.howItWorks.highlight": "Konzistence vítězí nad intenzitou. Buďte tu každý týden.",
  "onboarding.aboutYou.title": "O vás",
  "onboarding.aboutYou.subtitle": "Pomozte nám personalizovat váš zážitek",
  "onboarding.body.title": "Tělesné údaje",
  "onboarding.body.subtitle": "Používá se pro BMI a doporučení aktivit",
  "onboarding.activity.title": "Úroveň aktivity",
  "onboarding.activity.subtitle": "Kolik se hýbete za týden?",
  "onboarding.country.title": "Odkud jste?",
  "onboarding.country.subtitle": "Volitelné — pomáhá najít lidi ve vašem okolí",
  "onboarding.genderLabel": "Pohlaví",
  "onboarding.birthYearLabel": "Rok narození",
  "onboarding.birthYearError": "Zadejte rok mezi {min} a {max}.",
  "onboarding.continue": "Pokračovat",
  "onboarding.back": "Zpět",
  "onboarding.skip": "Teď přeskočit",
  "onboarding.weeklyLessThan1": "Méně než 1 hodina",
  "onboarding.weekly1to3": "1–3 hodiny",
  "onboarding.weekly3to5": "3–5 hodin",
  "onboarding.weekly5to7": "5–7 hodin",
  "onboarding.weekly7plus": "7+ hodin",
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
  "tutorial.skip": "Preskočiť",
  "tutorial.next": "Ďalej",
  "tutorial.getStarted": "Začať",
  "tutorial.minPerDay": "{n} min/deň",
  "tutorial.welcome.title": "Vitajte v H7",
  "tutorial.welcome.subtitle": "Vaša cesta k zdravšiemu životu začína tu",
  "tutorial.welcome.body": "H7 je jednoduchý systém, ktorý vám pomôže vybudovať návyk pravidelného pohybu. Bez zložitých tréningov, bez drahého vybavenia — len vy a vaša každodenná pohybová aktivita.\n\nCieľ je jednoduchý: nazbierať každý týždeň dosť aktívnych minút na dosiahnutie a udržanie vašej cieľovej úrovne.",
  "tutorial.levels.title": "Systém úrovní H7",
  "tutorial.levels.subtitle": "7 úrovní, ako pásy v bojových umeniach",
  "tutorial.levels.body": "Vaša úroveň H odráža týždennú konzistenciu pohybu. Každá úroveň vyžaduje určitý počet aktívnych minút denne v priemere.\n\nZačnite na H1 a postupujte vyššie s rastúcou kondíciou.",
  "tutorial.levels.highlight": "H1 = 9 min/deň · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "Čo sa počíta?",
  "tutorial.whatCounts.subtitle": "Takmer akýkoľvek pohyb, ktorý zrýchli váš tep",
  "tutorial.whatCounts.body": "Chôdza, beh, cyklistika, plávanie, joga, tanec, šport, silový tréning, turistika — ak vás to rozhýbe s vedomým úsilím, počíta sa to.\n\nJediné pravidlo: aktivita musí byť aspoň „vedomej\" intenzity — mali by ste cítiť, ako pracuje srdce a pľúca.",
  "tutorial.whatCounts.highlight": "Pokojná prechádzka sa nepočíta, ale svižná áno!",
  "tutorial.howItWorks.title": "Ako to funguje",
  "tutorial.howItWorks.subtitle": "Zaznamenajte, sledujte, postúpte vyššie",
  "tutorial.howItWorks.body": "1. Každý deň zaznamenajte svoje aktivity — ručne alebo cez pripojené zariadenia.\n2. Sledujte svoj týždenný pokrok na prehľade.\n3. Po 3+ týždňoch na úrovni získate ochranu — jeden zlý týždeň vás nezhodí.\n4. Postúpte vyššie, keď budete pripravení.",
  "tutorial.howItWorks.highlight": "Konzistencia víťazí nad intenzitou. Buďte tu každý týždeň.",
  "onboarding.aboutYou.title": "O vás",
  "onboarding.aboutYou.subtitle": "Pomôžte nám personalizovať váš zážitok",
  "onboarding.body.title": "Telesné údaje",
  "onboarding.body.subtitle": "Používa sa na BMI a odporúčania aktivít",
  "onboarding.activity.title": "Úroveň aktivity",
  "onboarding.activity.subtitle": "Koľko sa hýbete za týždeň?",
  "onboarding.country.title": "Odkiaľ ste?",
  "onboarding.country.subtitle": "Voliteľné — pomáha nájsť ľudí vo vašom okolí",
  "onboarding.genderLabel": "Pohlavie",
  "onboarding.birthYearLabel": "Rok narodenia",
  "onboarding.birthYearError": "Zadajte rok medzi {min} a {max}.",
  "onboarding.continue": "Pokračovať",
  "onboarding.back": "Späť",
  "onboarding.skip": "Teraz preskočiť",
  "onboarding.weeklyLessThan1": "Menej ako 1 hodina",
  "onboarding.weekly1to3": "1–3 hodiny",
  "onboarding.weekly3to5": "3–5 hodín",
  "onboarding.weekly5to7": "5–7 hodín",
  "onboarding.weekly7plus": "7+ hodín",
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
