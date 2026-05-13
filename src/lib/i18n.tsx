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
  "profile.language": "Language",
  "profile.privacyPolicy": "Privacy Policy",
  "profile.helpSupport": "Help & Support",
  "profile.signOut": "Sign Out",
  "profile.extendStaircase": "Extend my H-staircase",
  "profile.extendDesc": "Unlock levels H8 through H14",
  "profile.replayOnboarding": "Replay onboarding",
  "profile.replayOnboardingSub": "Walk through the setup steps again",
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
  "tutorial.getStarted": "Let's Get Started!",
  "tutorial.minPerDay": "{n} min/day",
  "tutorial.welcome.title": "Welcome to H7",
  "tutorial.welcome.subtitle": "Your path to a healthier life through regular movement",
  "tutorial.welcome.body": "H7 helps people who don't move regularly and enough find a simple, sustainable way to start and not stop. No extreme workouts. Just consistent movement that gets your heart and lungs working.",
  "tutorial.levels.title": "7 Levels",
  "tutorial.levels.subtitle": "Start small, then continue at your own pace",
  "tutorial.levels.body": "From H1 (just 9 min/day) all the way to H7 (60 min/day). Each level has its own judo-belt color. Stay at each level for 3–8 weeks, until you feel better and your body has adapted. There's no rush. Even H3 is already a huge plus for your health.",
  "tutorial.levels.highlight": "H1 = 9 min/day · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "What Counts for H7?",
  "tutorial.whatCounts.subtitle": "Any activity that raises your heart rate.",
  "tutorial.whatCounts.body": "Brisk walking, cycling, dancing, gardening, even intense housework… Anything where you noticeably breathe deeper and feel your heart rate rise. It doesn't have to be a sport, but a leisurely walk or sitting around playing chess doesn't count.",
  "tutorial.whatCounts.highlight": "The key: you should feel your breathing and heart rate increase.",
  "tutorial.howItWorks.title": "How It Works",
  "tutorial.howItWorks.subtitle": "Log, track, level up",
  "tutorial.howItWorks.body": "1. Log your activity after each session (also auto-imported from Apple Health / Android Health).\n2. Watch your daily and weekly consistency grow.\n3. After 3+ weeks at each level, you earn protection. One bad week won't drop you.\n4. Level up when you're ready. Stay where you feel good.",
  "tutorial.howItWorks.highlight": "Your only goal: find YOUR sustainable level of regular movement and stay there.",
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
  // My Path page
  "myPath.title": "My Path",
  "myPath.yourLevel": "YOUR LEVEL",
  "myPath.minDaily": "MIN DAILY",
  "myPath.weekly": "Weekly",
  "myPath.dailyAvg": "Daily avg",
  "myPath.recommendedActivities": "Recommended Activities",
  "myPath.moreOnWeb": "More details on H7 website",
  "myPath.graceTitle": "How Grace Works",
  "myPath.graceBody": "After 3 consecutive weeks at the same level, you earn a grace week. If you slip one week, grace keeps you at your level. Grace is consumed on use and must be re-earned with another 3 consecutive weeks.",
  "common.close": "Close",
  // Level descriptions (fallback for H0 / H8+ — H1..H7 use level-activity-details data)
  "level.h0.desc": "Start your journey!",
  "level.h8.desc": "69 minutes daily. Beyond black belt — you're pushing into elite territory. Vary your training to stay injury-free.",
  "level.h9.desc": "77 minutes daily. Diamond-level commitment! Consider periodized training with recovery days built in.",
  "level.h10.desc": "86 minutes daily. Ruby intensity — mix endurance with strength and flexibility for a complete athlete profile.",
  "level.h11.desc": "94 minutes daily. Sapphire dedication! You're training like a semi-professional. Listen to your body.",
  "level.h12.desc": "103 minutes daily. Emerald mastery — nearly two hours of daily movement. Focus on quality and recovery.",
  "level.h13.desc": "111 minutes daily. Gold standard! Multi-sport training and active lifestyle are your norm.",
  "level.h14.desc": "120 minutes daily — the ultimate level. Two hours of daily movement. You are a true master of fitness.",
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
  "profile.language": "Jazyk",
  "profile.privacyPolicy": "Zásady ochrany soukromí",
  "profile.helpSupport": "Nápověda a podpora",
  "profile.signOut": "Odhlásit se",
  "profile.extendStaircase": "Rozšířit moje H-schodiště",
  "profile.extendDesc": "Odemkněte úrovně H8 až H14",
  "profile.replayOnboarding": "Znovu projít nastavení",
  "profile.replayOnboardingSub": "Projděte si znovu jednotlivé kroky",
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
  "tutorial.getStarted": "Pojďme začít!",
  "tutorial.minPerDay": "{n} min/den",
  "tutorial.welcome.title": "Vítejte v H7",
  "tutorial.welcome.subtitle": "Vaše cesta ke zdravějšímu životu skrze pravidelný pohyb",
  "tutorial.welcome.body": "H7 pomáhá lidem, kteří se pravidelně a dostatečně nehýbou, najít jednoduchý a udržitelný způsob, jak začít a nepřestat. Bez extrémních tréninků. Jen pravidelný pohyb, který rozhýbe vaše srdce a plíce.",
  "tutorial.levels.title": "7 úrovní",
  "tutorial.levels.subtitle": "Začněte malými kroky, v klidu pokračujte vlastním tempem",
  "tutorial.levels.body": "Od H1 (jen 9 min/den) po H7 (60 min/den). Každá úroveň má svou barvu pásku jako v judu. Zůstaňte na každé úrovni 3–8 týdnů. Dokud sami neucítíte, že je vám lépe a tělo se adaptovalo. Není kam spěchat. I H3 je už velkým přínosem pro vaše zdraví.",
  "tutorial.levels.highlight": "H1 = 9 min/den · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "Co se počítá jako H7?",
  "tutorial.whatCounts.subtitle": "Jakákoli aktivita, která zrychlí váš tep.",
  "tutorial.whatCounts.body": "Svižná chůze, jízda na kole, tanec, zahradničení, i intenzivní úklid… Cokoli, při čem znatelně dýcháte zhluboka a cítíte zrychlení tepu. Nemusí to být přímo sport, ale klidná procházka nebo sezení u šachů se nepočítá.",
  "tutorial.whatCounts.highlight": "Klíčové: měli byste cítit zrychlení dechu a tepu.",
  "tutorial.howItWorks.title": "Jak to funguje",
  "tutorial.howItWorks.subtitle": "Zaznamenat, sledovat, postoupit",
  "tutorial.howItWorks.body": "1. Po každém cvičení zaznamenejte svou aktivitu (také se sama importuje z Apple Health / Android Health).\n2. Sledujte, jak roste vaše denní a týdenní konzistence.\n3. Po 3+ týdnech na úrovni získáte ochranu. Jeden špatný týden vás nesrazí.\n4. Postupte výš, až budete připraveni. Zůstaňte tam, kde je vám dobře.",
  "tutorial.howItWorks.highlight": "Váš jediný cíl: najít SVOU udržitelnou úroveň pravidelného pohybu a zůstat na ní.",
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
  "myPath.title": "Moje cesta",
  "myPath.yourLevel": "VAŠE ÚROVEŇ",
  "myPath.minDaily": "MIN DENNĚ",
  "myPath.weekly": "Týdně",
  "myPath.dailyAvg": "Denní průměr",
  "myPath.recommendedActivities": "Doporučené aktivity",
  "myPath.moreOnWeb": "Více informací na webu H7",
  "myPath.graceTitle": "Jak funguje milost",
  "myPath.graceBody": "Po 3 po sobě jdoucích týdnech na stejné úrovni získáte týden milosti. Pokud vynecháte jeden týden, milost vás udrží na vaší úrovni. Milost se spotřebovává a musí být znovu získána dalšími 3 po sobě jdoucími týdny.",
  "common.close": "Zavřít",
  "level.h0.desc": "Začněte svou cestu!",
  "level.h8.desc": "69 minut denně. Za černým pásem — posouváte se do elitního území. Střídejte trénink, abyste předešli zraněním.",
  "level.h9.desc": "77 minut denně. Diamantové nasazení! Zvažte periodizovaný trénink se zabudovanými dny na regeneraci.",
  "level.h10.desc": "86 minut denně. Rubínová intenzita — kombinujte vytrvalost se silou a flexibilitou pro kompletní atletický profil.",
  "level.h11.desc": "94 minut denně. Safírové odhodlání! Trénujete jako poloprofesionál. Naslouchejte svému tělu.",
  "level.h12.desc": "103 minut denně. Smaragdové mistrovství — téměř dvě hodiny denního pohybu. Zaměřte se na kvalitu a regeneraci.",
  "level.h13.desc": "111 minut denně. Zlatý standard! Multisportovní trénink a aktivní životní styl jsou vaší normou.",
  "level.h14.desc": "120 minut denně — nejvyšší úroveň. Dvě hodiny denního pohybu. Jste skutečný mistr kondice.",
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
  "profile.language": "Jazyk",
  "profile.privacyPolicy": "Zásady ochrany súkromia",
  "profile.helpSupport": "Pomoc a podpora",
  "profile.signOut": "Odhlásiť sa",
  "profile.extendStaircase": "Rozšíriť moje H-schodisko",
  "profile.extendDesc": "Odomknite úrovne H8 až H14",
  "profile.replayOnboarding": "Znova prejsť nastavenie",
  "profile.replayOnboardingSub": "Prejdite si znova jednotlivé kroky",
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
  "tutorial.getStarted": "Poďme začať!",
  "tutorial.minPerDay": "{n} min/deň",
  "tutorial.welcome.title": "Vitajte v H7",
  "tutorial.welcome.subtitle": "Vaša cesta k zdravšiemu životu cez pravidelný pohyb",
  "tutorial.welcome.body": "H7 pomáha ľuďom, ktorí sa pravidelne a dostatočne nehýbu, nájsť jednoduchý a udržateľný spôsob, ako začať a neprestať. Bez extrémnych tréningov. Len pravidelný pohyb, ktorý rozhýbe vaše srdce a pľúca.",
  "tutorial.levels.title": "7 úrovní",
  "tutorial.levels.subtitle": "Začnite malými krokmi, v pokoji pokračujte vlastným tempom",
  "tutorial.levels.body": "Od H1 (len 9 min/deň) po H7 (60 min/deň). Každá úroveň má svoju farbu pásu ako v jude. Zostaňte na každej úrovni 3–8 týždňov. Kým sami nepocítite, že vám je lepšie a telo sa adaptovalo. Niet kam ponáhľať sa. Aj H3 je už veľkým prínosom pre vaše zdravie.",
  "tutorial.levels.highlight": "H1 = 9 min/deň · H2 = 17 min · H3 = 26 min · H4 = 35 min · H5 = 43 min · H6 = 52 min · H7 = 60 min",
  "tutorial.whatCounts.title": "Čo sa počíta ako H7?",
  "tutorial.whatCounts.subtitle": "Akákoľvek aktivita, ktorá zrýchli váš tep.",
  "tutorial.whatCounts.body": "Svižná chôdza, jazda na bicykli, tanec, záhradkárčenie, aj intenzívne upratovanie… Čokoľvek, pri čom znateľne dýchate hlbšie a cítite zrýchlenie tepu. Nemusí to byť priamo šport, ale pokojná prechádzka alebo sedenie pri šachu sa nepočíta.",
  "tutorial.whatCounts.highlight": "Kľúčové: mali by ste cítiť zrýchlenie dychu a tepu.",
  "tutorial.howItWorks.title": "Ako to funguje",
  "tutorial.howItWorks.subtitle": "Zaznamenať, sledovať, postúpiť",
  "tutorial.howItWorks.body": "1. Po každom cvičení zaznamenajte svoju aktivitu (tiež sa sama importuje z Apple Health / Android Health).\n2. Sledujte, ako rastie vaša denná a týždenná konzistencia.\n3. Po 3+ týždňoch na úrovni získate ochranu. Jeden zlý týždeň vás nezhodí.\n4. Postúpte vyššie, keď budete pripravení. Zostaňte tam, kde sa cítite dobre.",
  "tutorial.howItWorks.highlight": "Váš jediný cieľ: nájsť SVOJU udržateľnú úroveň pravidelného pohybu a zostať na nej.",
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
  "myPath.title": "Moja cesta",
  "myPath.yourLevel": "VAŠA ÚROVEŇ",
  "myPath.minDaily": "MIN DENNE",
  "myPath.weekly": "Týždenne",
  "myPath.dailyAvg": "Denný priemer",
  "myPath.recommendedActivities": "Odporúčané aktivity",
  "myPath.moreOnWeb": "Viac informácií na webe H7",
  "myPath.graceTitle": "Ako funguje milosť",
  "myPath.graceBody": "Po 3 po sebe idúcich týždňoch na rovnakej úrovni získate týždeň milosti. Ak vynecháte jeden týždeň, milosť vás udrží na vašej úrovni. Milosť sa spotrebuje a musí byť znovu získaná ďalšími 3 po sebe idúcimi týždňami.",
  "common.close": "Zavrieť",
  "level.h0.desc": "Začnite svoju cestu!",
  "level.h8.desc": "69 minút denne. Za čiernym pásom — posúvate sa do elitného územia. Striedajte tréning, aby ste predišli zraneniam.",
  "level.h9.desc": "77 minút denne. Diamantové nasadenie! Zvážte periodizovaný tréning so zabudovanými dňami na regeneráciu.",
  "level.h10.desc": "86 minút denne. Rubínová intenzita — kombinujte vytrvalosť so silou a flexibilitou pre kompletný atletický profil.",
  "level.h11.desc": "94 minút denne. Zafírové odhodlanie! Trénujete ako poloprofesionál. Načúvajte svojmu telu.",
  "level.h12.desc": "103 minút denne. Smaragdové majstrovstvo — takmer dve hodiny denného pohybu. Zamerajte sa na kvalitu a regeneráciu.",
  "level.h13.desc": "111 minút denne. Zlatý štandard! Multišportový tréning a aktívny životný štýl sú vašou normou.",
  "level.h14.desc": "120 minút denne — najvyššia úroveň. Dve hodiny denného pohybu. Ste skutočný majster kondície.",
};

const dictionaries: Record<"en" | "cs" | "sk", Dict> = { en, cs, sk };

export type TKey = keyof typeof en;

// ---- Context ---------------------------------------------------------------

interface I18nContextValue {
  language: AppLanguage;
  code: "en" | "cs" | "sk";
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
      code,
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
