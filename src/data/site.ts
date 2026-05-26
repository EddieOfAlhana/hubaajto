/**
 * Single source of truth for all site-wide constants.
 * Subagents and components must import from here — never hardcode.
 */

export const SITE = {
  brand: "Huba ajtó",
  legalName: "Szer-X3 Kereskedelmi és Szolgáltató Kft.",
  shortLegal: "Szer-X3 Kft.",
  tagline: "Minőség a biztonságért",
  taglineLong: "Korhű biztonsági ajtótól a modern panelig — Kistarcsán gyártva.",
  url: "https://hubaajto.hu",
  locale: "hu-HU",
  language: "hu",
  founded: 2003,
  mabiszSince: 2009,
  warrantyYears: 15,
  priceFromHUF: 330_000,
} as const;

export const CONTACT = {
  phonePrimary: "+36 30 740 4458",
  phonePrimaryTel: "+3630 740 4458",
  phoneSecondary: "+36 30 740 4459",
  phoneTertiary: "+36 30 740 4460",
  landline: "+36 1 410 4358",
  email: "info@szerx.hu",
  address: {
    postal: "2143",
    city: "Kistarcsa",
    street: "Nagytarcsai út 6.",
    country: "Magyarország",
    latitude: 47.541,
    longitude: 19.260,
  },
  hours: {
    weekday: "H–P: 8:00–17:00",
    saturday: "Szo: 8:00–12:00",
  },
  social: {
    facebook: "https://www.facebook.com/", // placeholder — confirm with client
  },
} as const;

export const SLA = {
  surveyDays: "2–3 nap",
  manufactureDays: "10–12 nap",
  installDays: "1 nap",
  permitTotal: "4–6 hónap",
} as const;

export const LOCKS = ["Mottura", "Abus", "Mul-T-Lock", "Iseo", "Cisa"] as const;

export const CERTIFICATIONS = [
  { name: "MABISZ-minősített biztonsági ajtó", since: 2009 },
  { name: "CE-jelölés (CPR 305/2011)" },
  { name: "Teljesítménynyilatkozat (DoP)" },
] as const;

/**
 * Districts where we work — split by product family per playbook §5.10.
 */
export const SERVICE_AREA = {
  heritage: {
    label: "Műemléki / belvárosi környezet",
    description: "Korhű, kazettás, betétes és festett biztonsági ajtók műemléki engedélyezéssel.",
    districts: [
      { code: "I", name: "Budavári Várnegyed", note: "UNESCO világörökség" },
      { code: "II", name: "Rózsadomb · Pasarét", note: "Helyi védettség" },
      { code: "V", name: "Belváros-Lipótváros" },
      { code: "VI", name: "Terézváros" },
      { code: "VII", name: "Erzsébetváros" },
      { code: "VIII", name: "Józsefváros", note: "TKR 1/2022 §53" },
      { code: "IX", name: "Ferencváros" },
      { code: "XII", name: "Hegyvidék" },
    ],
  },
  modern: {
    label: "Prémium családi házak — Pest agglomeráció keleti ív",
    description: "Saját gyártású, MABISZ-minősített bejárati ajtó új építésű és felújított házakhoz.",
    towns: [
      "Kistarcsa", "Nagytarcsa", "Kerepes", "Csömör", "Mogyoród",
      "Gödöllő", "Veresegyház", "Fót", "Pécel", "Isaszeg", "Dunakeszi",
    ],
  },
  modernBuda: {
    label: "Prémium családi házak — budai agglomeráció",
    towns: ["Telki", "Páty", "Budakeszi", "Nagykovácsi", "Solymár", "Pilisborosjenő", "Üröm", "Budakalász", "Pomáz"],
  },
  modernPest: {
    label: "Modern Budapest — Kistarcsához legközelebbi kerületek",
    districts: ["XIII", "XIV", "XV", "XVI", "XVII", "X", "IV"],
  },
} as const;

export const NAV = [
  { label: "Termékek", href: "/biztonsagi-ajto" },
  { label: "Stílus / Műemléki", href: "/stilus-biztonsagi-ajto" },
  { label: "Engedélyezés", href: "/engedelyezesi-csomag" },
  { label: "Ajtótervező", href: "/ajtotervezo" },
  { label: "Referenciák", href: "/referenciak" },
  { label: "Árak", href: "/arak" },
  { label: "Blog", href: "/blog" },
  { label: "Kapcsolat", href: "/kapcsolat" },
] as const;

export const FOOTER_NAV = [
  {
    heading: "Termékek",
    links: [
      { label: "Modern biztonsági ajtó", href: "/biztonsagi-ajto" },
      { label: "Stílus / klasszikus", href: "/stilus-biztonsagi-ajto" },
      { label: "Műemléki ajtók", href: "/muemleki-biztonsagi-ajto" },
      { label: "Engedélyezési csomag", href: "/engedelyezesi-csomag" },
      { label: "Ajtótervező", href: "/ajtotervezo" },
    ],
  },
  {
    heading: "Információk",
    links: [
      { label: "Árak", href: "/arak" },
      { label: "15 év garancia", href: "/garancia" },
      { label: "Minőségünk", href: "/minosegunk" },
      { label: "Ingyenes felmérés", href: "/felmeres" },
      { label: "Részletfizetés", href: "/reszletfizetes" },
      { label: "GYIK", href: "/gyik" },
    ],
  },
  {
    heading: "Cég",
    links: [
      { label: "Rólunk", href: "/rolunk" },
      { label: "Referenciák", href: "/referenciak" },
      { label: "Blog", href: "/blog" },
      { label: "Szolgáltatási terület", href: "/biztonsagi-ajto-budapest" },
      { label: "Kapcsolat", href: "/kapcsolat" },
    ],
  },
  {
    heading: "Jogi",
    links: [
      { label: "Impresszum", href: "/impresszum" },
      { label: "Adatvédelmi tájékoztató", href: "/adatvedelem" },
      { label: "Süti tájékoztató", href: "/suti" },
      { label: "ÁSZF / Vállalási feltételek", href: "/aszf" },
      { label: "Békéltető testület", href: "/bekelteto" },
    ],
  },
] as const;
