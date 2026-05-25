/**
 * Catalogue model for the /ajtotervezo configurator.
 *
 * v1: real catalogue strings, real RAL codes for the frame, real wood
 * pattern names (35) and milled pattern set (15), real lock lineup. Until
 * the photographed JPGs are migrated from the legacy site (ajtomintak/,
 * ajtomintak2/), each entry's `swatch` is a CSS-paintable colour or a
 * placeholder gradient so the catalogue renders visually without needing
 * binary assets. When the real JPGs land, swap `swatch` → `imageUrl`
 * pointing at /assets/configurator/<family>/<id>.avif (with WebP fallback)
 * — every other piece of the configurator survives that swap untouched.
 */

export type SwatchPaint =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; angle?: number };

export type ConfigOption = {
  id: string;
  label: string;
  /** Optional sublabel rendered in lighter type beneath the label. */
  hint?: string;
  /** CSS-only swatch until real JPGs are imported. */
  swatch: SwatchPaint;
  /** Future field — points at the photographed JPG once migrated. */
  imageUrl?: string;
  /** Surcharge over the 330 000 Ft entry price. */
  priceModifier?: number;
};

// ──────────────────────────────────────────────────────────────────────
// Step 1 — Tokszín (frame colour). Eight RAL options.
// ──────────────────────────────────────────────────────────────────────

export const FRAME_COLOURS: ConfigOption[] = [
  { id: "ral-9010", label: "RAL 9010", hint: "Fehér",         swatch: { kind: "solid", color: "#F1ECE0" } },
  { id: "ral-9005", label: "RAL 9005", hint: "Mélyfekete",    swatch: { kind: "solid", color: "#0E0F11" } },
  { id: "ral-7016", label: "RAL 7016", hint: "Antracitszürke",swatch: { kind: "solid", color: "#383E42" } },
  { id: "ral-6009", label: "RAL 6009", hint: "Fenyőzöld",     swatch: { kind: "solid", color: "#27352B" } },
  { id: "ral-8014", label: "RAL 8014", hint: "Gesztenyebarna",swatch: { kind: "solid", color: "#4A3324" } },
  { id: "ral-3004", label: "RAL 3004", hint: "Mély bordó",    swatch: { kind: "solid", color: "#651423" } },
  { id: "ral-7035", label: "RAL 7035", hint: "Világosszürke", swatch: { kind: "solid", color: "#C8C9C7" } },
  { id: "ral-1015", label: "RAL 1015", hint: "Elefántcsont",  swatch: { kind: "solid", color: "#E5DCC2" } },
];

// ──────────────────────────────────────────────────────────────────────
// Step 2 / 5 — Borítás (cladding) type.
// ──────────────────────────────────────────────────────────────────────

export const CLADDING_TYPES_EXTERIOR: ConfigOption[] = [
  { id: "fa",   label: "Fa borítás",   hint: "Bükk, tölgy, cseresznye alapok 7 színárnyalattal", swatch: { kind: "gradient", from: "#A57A4D", to: "#5C3B1F", angle: 145 } },
  { id: "mart", label: "Mart minta",   hint: "MDF maratott felület 15 mintával",                  swatch: { kind: "gradient", from: "#C6BBA9", to: "#7A6A52", angle: 145 } },
];

export const CLADDING_TYPES_INTERIOR: ConfigOption[] = [
  ...CLADDING_TYPES_EXTERIOR,
  { id: "same", label: "Mint a külső", hint: "Belül ugyanaz, mint kívül", swatch: { kind: "gradient", from: "#E5DCC2", to: "#B08A4A", angle: 145 } },
];

// ──────────────────────────────────────────────────────────────────────
// Step 3 / 6 — Mintázat (pattern). 35 wood combos × 15 milled.
// ──────────────────────────────────────────────────────────────────────

// Map of base wood → 7 lacquer tones, exactly matching the legacy SWF's
// ajtomintak/ filenames (see swf/AJTOTERVEZO_DECOMPILE.md §"Wood (Fa)").
const WOOD_BASES = [
  { id: "bukk",       label: "Bükk",       swatch: "#C9A37A" },
  { id: "cseresznye", label: "Cseresznye", swatch: "#A66238" },
  { id: "fenyo",      label: "Fenyő",      swatch: "#D9B68B" },
  { id: "mahagoni",   label: "Mahagóni",   swatch: "#6E2E1E" },
  { id: "tolgy",      label: "Tölgy",      swatch: "#9B6A36" },
] as const;

const WOOD_LACQUERS = [
  { id: "dio",         label: "dió",         tone: "#3F2614" },
  { id: "gesztenye",   label: "gesztenye",   tone: "#4A2A18" },
  { id: "lakk",        label: "lakk",        tone: "#8A5A2E" },
  { id: "mahagoni",    label: "mahagóni",    tone: "#5B1E12" },
  { id: "paliszander", label: "paliszander", tone: "#2C160C" },
  { id: "teak",        label: "teak",        tone: "#6F3E1E" },
  { id: "tolgy",       label: "tölgy",       tone: "#8B6A39" },
] as const;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const WOOD_PATTERNS: ConfigOption[] = WOOD_BASES.flatMap((base) =>
  WOOD_LACQUERS.map((lac) => ({
    id: `${base.id}-${lac.id}`,
    label: `${base.label}-${lac.label}`,
    hint: `${capitalise(base.label)} alap ${lac.label} pácolással`,
    swatch: { kind: "gradient" as const, from: base.swatch, to: lac.tone, angle: 135 },
    // Real photographed sample from the Huba ajtó catalogue.
    imageUrl: `/assets/configurator/wood/${base.id}-${lac.id}.jpg`,
  })),
);

// 15 milled (Mart) base designs — labelled "Mart minta #1" through #15.
// The legacy SWF only shipped G1..G15 (out of 25 advertised on the legacy
// site); we restore exactly those 15 here. When the real JPGs are available
// each id `g1`..`g15` corresponds to `ajtomintak2/G{n}_110.jpg`.
export const MILLED_PATTERNS: ConfigOption[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const palette = ["#D7CFBA", "#C9C0A6", "#BCAF8E", "#A89878", "#917F5C"];
  const tone = palette[i % palette.length];
  return {
    id: `g${n}`,
    label: `Mart minta #${n}`,
    hint: `Egyedi mart fa mintázat`,
    swatch: { kind: "gradient" as const, from: "#EEE6D2", to: tone, angle: 135 },
    // Real photographed sample from the Huba ajtó catalogue (G1..G15).
    imageUrl: `/assets/configurator/milled/G${n}.jpg`,
  };
});

// ──────────────────────────────────────────────────────────────────────
// Step 4 / 7 — Szín (colour). Depends on the cladding type from step 2/5.
// Wood path = lacquer tones; mart path = RAL repaintable shades.
// ──────────────────────────────────────────────────────────────────────

export const WOOD_COLOURS: ConfigOption[] = WOOD_LACQUERS.map((lac) => ({
  id: `wood-${lac.id}`,
  label: capitalise(lac.label),
  hint: "Pácolt fafelület",
  swatch: { kind: "solid", color: lac.tone },
}));

export const MART_COLOURS: ConfigOption[] = [
  { id: "mart-9010", label: "RAL 9010", hint: "Fehér",          swatch: { kind: "solid", color: "#F1ECE0" } },
  { id: "mart-9005", label: "RAL 9005", hint: "Mélyfekete",     swatch: { kind: "solid", color: "#0E0F11" } },
  { id: "mart-7016", label: "RAL 7016", hint: "Antracitszürke", swatch: { kind: "solid", color: "#383E42" } },
  { id: "mart-6009", label: "RAL 6009", hint: "Fenyőzöld",      swatch: { kind: "solid", color: "#27352B" } },
  { id: "mart-8014", label: "RAL 8014", hint: "Gesztenyebarna", swatch: { kind: "solid", color: "#4A3324" } },
  { id: "mart-3004", label: "RAL 3004", hint: "Mély bordó",     swatch: { kind: "solid", color: "#651423" } },
  { id: "mart-1015", label: "RAL 1015", hint: "Elefántcsont",   swatch: { kind: "solid", color: "#E5DCC2" } },
  { id: "mart-7035", label: "RAL 7035", hint: "Világosszürke",  swatch: { kind: "solid", color: "#C8C9C7" } },
];

// ──────────────────────────────────────────────────────────────────────
// Step 8 — Zár (lock). Five premium brands × MABISZ classes.
// ──────────────────────────────────────────────────────────────────────

export type LockOption = ConfigOption & {
  origin: string;
  mabiszClasses: Array<{ id: "m2" | "m3" | "m4"; label: string; resistance: string; surcharge: number }>;
};

const MABISZ_CLASSES = [
  { id: "m2" as const, label: "MABISZ 2. osztály", resistance: "3 perc ellenállás", surcharge: 0 },
  { id: "m3" as const, label: "MABISZ 3. osztály", resistance: "5 perc ellenállás", surcharge: 35_000 },
  { id: "m4" as const, label: "MABISZ 4. osztály", resistance: "10 perc ellenállás", surcharge: 90_000 },
];

export const LOCKS: LockOption[] = [
  {
    id: "mottura", label: "Mottura", origin: "Olasz",
    hint: "Lamellás zártest, prémium márka",
    swatch: { kind: "gradient", from: "#B08A4A", to: "#5C3B1F", angle: 135 },
    mabiszClasses: MABISZ_CLASSES,
  },
  {
    id: "abus", label: "Abus", origin: "Német",
    hint: "Cilinderes biztonsági zár",
    swatch: { kind: "gradient", from: "#7A8086", to: "#383E42", angle: 135 },
    mabiszClasses: MABISZ_CLASSES,
  },
  {
    id: "mul-t-lock", label: "Mul-T-Lock", origin: "Izraeli prémium",
    hint: "Magas biztonsági cilinder",
    swatch: { kind: "gradient", from: "#8E6B3A", to: "#2A2D31", angle: 135 },
    mabiszClasses: MABISZ_CLASSES,
  },
  {
    id: "iseo", label: "Iseo", origin: "Olasz prémium",
    hint: "Szabályozható biztonsági rendszer",
    swatch: { kind: "gradient", from: "#A89878", to: "#4A3324", angle: 135 },
    mabiszClasses: MABISZ_CLASSES,
  },
  {
    id: "cisa", label: "Cisa", origin: "Olasz, motoros opcióval",
    hint: "Motoros zárral is rendelhető",
    swatch: { kind: "gradient", from: "#B7BBC1", to: "#2A2D31", angle: 135 },
    mabiszClasses: MABISZ_CLASSES,
  },
];

// ──────────────────────────────────────────────────────────────────────
// Step descriptor — the wizard reads this metadata to render headings.
// ──────────────────────────────────────────────────────────────────────

export type StepId =
  | "frame" | "ext-type" | "ext-pattern" | "ext-colour"
  | "int-type" | "int-pattern" | "int-colour"
  | "lock" | "summary";

export type StepMeta = {
  id: StepId;
  number: number;
  label: string;        // Hungarian label for progress / heading
  hu: string;           // long Hungarian heading
  hint?: string;
};

export const STEPS: StepMeta[] = [
  { id: "frame",        number: 1, label: "Tokszín",          hu: "Válassza ki az ajtótok színét",                    hint: "A tok kerete a fix része az ajtónak — érdemes a falszínhez vagy a homlokzathoz hangolni." },
  { id: "ext-type",     number: 2, label: "Külső borítás",    hu: "Milyen legyen kívülről?",                          hint: "Fa vagy mart minta — a választás befolyásolja a következő lépés mintáit." },
  { id: "ext-pattern",  number: 3, label: "Külső mintázat",   hu: "Külső mintázat kiválasztása",                      hint: "35 fa kombináció vagy 15 mart minta közül választhat." },
  { id: "ext-colour",   number: 4, label: "Külső szín",       hu: "Külső szín kiválasztása",                          hint: "A mintázathoz hangolt árnyalat." },
  { id: "int-type",     number: 5, label: "Belső borítás",    hu: "Milyen legyen belülről?",                          hint: "Belül választhat eltérő borítást — vagy hagyhatja megegyezőként a külsővel." },
  { id: "int-pattern",  number: 6, label: "Belső mintázat",   hu: "Belső mintázat kiválasztása",                      hint: "Ugyanaz a katalógus, mint a külső oldalon." },
  { id: "int-colour",   number: 7, label: "Belső szín",       hu: "Belső szín kiválasztása",                          hint: "Belső térhez hangolt árnyalat." },
  { id: "lock",         number: 8, label: "Zár",              hu: "Válasszon zárrendszert",                           hint: "Öt prémium márka, mindegyik MABISZ-besorolással." },
  { id: "summary",      number: 9, label: "Összegzés",        hu: "Foglalja le ingyenes helyszíni felmérését",        hint: "A pontos ár a helyszíni felmérés után válik véglegessé." },
];
