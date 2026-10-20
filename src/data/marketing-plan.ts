/**
 * Huba's marketing plan for Gabi: what would bring orders, what is already done, what is on
 * Zoltán, what is on Gabi, and the materials made so far. Huba reads it through the
 * `marketing_plan` tool in owner mode (src/lib/huba/agent.ts) and talks it through with Gabi.
 *
 * Keep it current: when something ships, flip its `status` here in the same commit. A few
 * statuses are derived from the runtime (SMTP set, Facebook link filled) so they cannot go stale.
 *
 * Research behind it: 2026-10-20 session (Hungarian 2026 Meta CPL bands, Meta Ads CLI,
 * Google Business Profile API rules, JóSzaki/Qjob/Jófogás fees, Budapesti Zöld Panelprogram).
 */

import { CONTACT } from "./site";

export type Status =
  | "kesz" // implemented and live
  | "folyamatban" // Zoltán is on it
  | "gabi" // waiting on a step only Gabi (the owner) can do
  | "dontes" // needs the owner's decision (budget, yes/no)
  | "tervezett"; // planned, not started

export const STATUS_HU: Record<Status, string> = {
  kesz: "kész",
  folyamatban: "folyamatban (Zoltán)",
  gabi: "Gabira vár",
  dontes: "döntésre vár",
  tervezett: "tervezett",
};

export type Group = "alap" | "ingyenes" | "fizetos" | "b2b";

export const GROUP_HU: Record<Group, string> = {
  alap: "Alapok — enélkül a többi nem ér semmit",
  ingyenes: "Ingyenes csatornák — egyszeri beállítás, utána automata",
  fizetos: "Fizetett hirdetés — kis kerettel, automatán kezelve",
  b2b: "Közvetítők — közös képviselők, alkuszok, felújítók",
};

export type Material = {
  id: string;
  title: string;
  /** Site path; images are shown inline by Huba, other files are linked. */
  src: string;
  kind: "kep" | "szoveg";
  note: string;
};

export type Item = {
  id: string;
  group: Group;
  title: string;
  status: Status;
  /** One or two sentences, in plain words, for the overview. */
  summary: string;
  /** Why it matters for orders. */
  why: string;
  /** What Zoltán (and the agents) do. */
  zoltan: string[];
  /** Steps only Gabi can do, in order, each one a concrete action. Empty when nothing is on Gabi. */
  gabi: string[];
  cost: string;
  /** Ongoing human effort once it runs. */
  effort: string;
  materials?: string[];
  notes?: string;
};

export const MATERIALS: Material[] = [
  {
    id: "meme-feszitovas-v1",
    title: "Facebook-kreatív, 1. változat: a feszítővas repül (első generálás)",
    src: "/assets/marketing/meme-feszitovas-v1.png",
    kind: "kep",
    note:
      "IKEA-stílusú poén a 2026-os Tesla-ugrató képére: az ajtó áll a rámpa tetején, a feszítővas lepattan róla. " +
      "Ez az első generált változat; a cím még a régi („Ez biztosan nem jön be.”), a végleges: „De ezen biztosan nem jön be.” " +
      "Az ajtó még kicsi és lebeg, a következő körben javítjuk.",
  },
  {
    id: "prompt-feszitovas",
    title: "Képgeneráló prompt az 1. kreatívhoz",
    src: "/assets/marketing/prompt-feszitovas.txt",
    kind: "szoveg",
    note: "A szöveg, amivel a kép generálható (ChatGPT), a két referenciaképpel együtt.",
  },
  {
    id: "prompt-auto",
    title: "Képgeneráló prompt a 4. kreatívhoz: az autó nekimegy, az ajtó marad",
    src: "/assets/marketing/prompt-auto.txt",
    kind: "szoveg",
    note: "Cím: „A jövő jöhet. Az ajtó marad.” Még nincs legenerálva.",
  },
  {
    id: "rampa-referencia",
    title: "Rámpa-referencia a generáláshoz",
    src: "/assets/marketing/rampa-referencia.jpg",
    kind: "kep",
    note: "A Tesla-ugrató fotója, csak a rámpa szerkezetéhez; az autó nem kerülhet a hirdetésbe.",
  },
  {
    id: "ajto-antracit",
    title: "Ajtó-referencia az 1. kreatívhoz (antracit, modern)",
    src: "/assets/photos/hero/modern-anthracite.jpg",
    kind: "kep",
    note: "Az oldal saját fotója, ezt kapja a képgeneráló.",
  },
  {
    id: "ajto-espresso",
    title: "Ajtó-referencia a 4. kreatívhoz (espresso, beépített)",
    src: "/assets/photos/hero/modern-espresso.jpg",
    kind: "kep",
    note: "Az oldal saját fotója, jól látszik a zárszerkezet.",
  },
];

const FACEBOOK_SET = !/facebook\.com\/?$/.test(CONTACT.social.facebook);

/** The plan with runtime-derived statuses resolved. */
export function marketingPlan(): Item[] {
  const smtp = Boolean(process.env.SMTP_HOST);
  return [
    // ─── Alapok ───────────────────────────────────────────────
    {
      id: "lead-kezbesites",
      group: "alap",
      title: "A webes érdeklődők e-mailben érkezzenek meg",
      status: "folyamatban",
      summary:
        "A kapcsolati űrlap és az ajtótervező beküldései ma csak a szerver naplójába kerülnek, e-mail nem megy róluk. " +
        (smtp ? "Huba megrendelés-e-mailje már megy." : "Huba megrendelés-e-mailje is csak akkor megy, ha a levélküldés be van kötve."),
      why: "Amíg ez nincs meg, minden más csatorna pénzkidobás: az érdeklődő ír, és senki nem tudja.",
      zoltan: [
        "Levélküldés bekötése az űrlapra és az ajtótervezőre (ugyanaz a postafiók, mint Hubáé).",
        "Azonnali Telegram-jelzés Zoltánnak minden új érdeklődőről, hogy semmi ne vesszen el.",
      ],
      gabi: smtp ? [] : ["Egy küldő postafiók adatai (SMTP: kiszolgáló, felhasználó, jelszó), vagy jóváhagyás, hogy a web@hubaajto.hu címet használjuk."],
      cost: "0 Ft",
      effort: "nincs",
    },
    {
      id: "ertekeles-szam",
      group: "alap",
      title: "A kitalált Google-értékelés levétele",
      status: "folyamatban",
      summary: "A főoldal és két aloldal „4,8 csillag, 127 Google-értékelés”-t mutat, de ez nem valódi adat. Valós számra cseréljük, vagy levesszük, amíg nincs elég értékelés.",
      why: "Egy kattintással kiderül, és a hitelesség az egész oldal alapja. Fogyasztóvédelmi kockázat is.",
      zoltan: ["A statikus szám levétele; később a valódi Google-adat bekötése a Business Profile-ból."],
      gabi: ["Megmondani, van-e már Google-cégprofil (Google Térképen a Szer-X3 / Huba ajtó), és hány értékelés van rajta."],
      cost: "0 Ft",
      effort: "nincs",
    },
    {
      id: "meres",
      group: "alap",
      title: "Mérés: ki jön, honnan, mit csinál",
      status: "folyamatban",
      summary: "Az oldalon még nincs látogatottság-mérés és Google Search Console sem. Sütimentes mérőt (Plausible vagy Umami) teszünk fel, és bekötjük a Search Console-t.",
      why: "Mérés nélkül egyik automata sem tudja eldönteni, melyik csatorna hoz megrendelést, és mire költsünk.",
      zoltan: ["Mérő felrakása a saját szerverre (ingyenes).", "Search Console igazolása a domainen (DNS), heti automatikus jelentés."],
      gabi: [],
      cost: "0–2 000 Ft/hó",
      effort: "nincs",
    },
    {
      id: "regi-url",
      group: "alap",
      title: "A régi weboldal címeinek átirányítása",
      status: "tervezett",
      summary: "A Google még a régi oldal címeit is mutatja (index.php, 5mp.eu). Ezeket az új oldal megfelelő lapjára irányítjuk.",
      why: "A régi oldal keresőereje átjön az újra, és senki nem fut hibás lapra.",
      zoltan: ["301-es átirányítások a régi útvonalakra.", "A 5mp.eu oldal törlése vagy átirányítása, ha van hozzá belépés."],
      gabi: ["Ha megvan a régi 5mp.eu belépés, azt odaadni Zoltánnak."],
      cost: "0 Ft",
      effort: "nincs",
    },

    // ─── Ingyenes csatornák ───────────────────────────────────
    {
      id: "gbp",
      group: "ingyenes",
      title: "Google-cégprofil (Google Térkép) rendbetétele",
      status: "gabi",
      summary: "A helyi megrendelések legnagyobb ingyenes forrása: aki „biztonsági ajtó Budapest”-et keres, a térképes találatokat látja először. Egyszer igazolni kell, utána a posztokat és az értékelés-válaszokat automata viszi.",
      why: "Ingyenes, és a kereső szándékú vevőt pont a vásárlás pillanatában éri el.",
      zoltan: [
        "Az igazolás után a profil feltöltése: fotók, nyitvatartás, szolgáltatások, a weboldal linkje.",
        "Google Business Profile API-hozzáférés kérése (feltétel: 60 napja igazolt profil + weboldal), utána heti poszt és értékelés-válasz automatán.",
      ],
      gabi: [
        "Belépni a google.com/business oldalra a cég Google-fiókjával (ha nincs, egy új Gmail is jó).",
        "Rákeresni: „Szer-X3 Kft Kistarcsa”. Ha már létezik a profil, „Ez az én vállalkozásom” és igénylés; ha nem, új profil: Huba ajtó, 2143 Kistarcsa, Nagytarcsai út 6.",
        "Az igazolás elvégzése (Google választ: videó a műhelyről, telefon vagy levelezőlap; a levelezőlap 1–2 hét).",
        "Zoltánt hozzáadni kezelőként (Felhasználók → Hozzáadás), hogy a többit ő intézhesse.",
      ],
      cost: "0 Ft",
      effort: "egyszeri igazolás, utána semmi",
    },
    {
      id: "ertekeles-gyujtes",
      group: "ingyenes",
      title: "Google-értékelések gyűjtése minden beépítés után",
      status: "tervezett",
      summary: "Beépítés után Huba e-mailt küld az ügyfélnek egy linkkel, ahol egy perc alatt értékelhet. Ez váltja ki a kitalált számot valódival.",
      why: "Az értékelések száma és frissessége dönti el, ki kerül a térképes találatok elejére.",
      zoltan: ["Értékelés-kérő levél és link, a beszélgetésben adott hozzájárulás alapján.", "Új értékelésnél Telegram-jelzés, válasz automatán."],
      gabi: ["Minden beépítés végén egy mondat Hubának megrendelői módban: „kész a beépítés, X. Y. ügyfél, e-mail: …”. Ennyi."],
      cost: "0 Ft",
      effort: "beépítésenként egy mondat",
      notes: "Előfeltétel: a Google-cégprofil igazolva (gbp).",
    },
    {
      id: "facebook-instagram",
      group: "ingyenes",
      title: "Facebook- és Instagram-oldal, automatikus posztolással",
      status: FACEBOOK_SET ? "folyamatban" : "gabi",
      summary: "Gabi mondta: az emberek a feedet pörgetik, ott kell megfogni őket. Egy cégoldal kell, utána az automata heti 2–3 posztot tesz ki a referenciafotókból és a blogból.",
      why: "Ingyenes jelenlét ott, ahol a vevők idejüket töltik, és a hirdetéshez is ez az alap.",
      zoltan: ["Automatikus posztolás a Meta-felületen (Graph API), heti terv, a tokenlejárat figyelése.", "Az oldal linkjének bekötése a weboldalba."],
      gabi: FACEBOOK_SET
        ? []
        : [
            "Facebook-oldal létrehozása: facebook.com/pages/create, név: Huba ajtó, kategória: Ajtó- és ablakgyártó, cím és telefon megadása.",
            "Instagram üzleti fiók (Huba ajtó) és összekötése az oldallal (Facebook-oldal beállítások → Összekapcsolt fiókok).",
            "Zoltánt hozzáadni adminisztrátorként (Oldalbeállítások → Oldalszerepkörök), hogy az automatát be tudja kötni.",
            "Az oldal linkjét elküldeni Hubának, hogy a weboldalra is felkerüljön.",
          ],
      cost: "0 Ft",
      effort: "havonta 10 perc: a kitett posztok átnézése",
      materials: ["meme-feszitovas-v1"],
    },
    {
      id: "video",
      group: "ingyenes",
      title: "Rövid videók a beépítésekről (YouTube Shorts, Facebook, TikTok)",
      status: "tervezett",
      summary: "Egy 30 másodperces telefonos felvétel a régi ajtó bontásáról és az új beépítéséről többet mutat, mint bármilyen szöveg. Az automata vágja, feliratozza és kiteszi.",
      why: "A rövid videó a legolcsóbb elérés 2026-ban, és egy ajtócsere látványos.",
      zoltan: ["Vágó- és feltöltő automata (YouTube ingyenes API, Facebook, TikTok).", "Felirat és leírás Huba stílusában."],
      gabi: ["Beépítésnél 3–4 rövid felvétel telefonnal: a régi ajtó, a bontás, az új ajtó beemelése, a kész kép. Küldés Hubának a 📎 gombbal vagy Zoltánnak."],
      cost: "0 Ft",
      effort: "beépítésenként 2 perc felvétel",
    },
    {
      id: "jegyzekek",
      group: "ingyenes",
      title: "Szakember-jegyzékek és térképek",
      status: "tervezett",
      summary: "A Tudjukki.hu-n már van egy igényeletlen Szer-X3 profil 4,4 csillaggal. Ezt igényeljük, a JóSzakin regisztrálunk (ingyenes, 2000 kredittel indul), és a Bing-, Apple-térképre is felkerül a cég.",
      why: "Olcsó találati helyek, és az ajánlatkérő portálokon kész, vásárló szándékú emberek vannak.",
      zoltan: ["A profilok előtöltése szöveggel és fotókkal, a Google-profilból importálva a Bing-, Apple-térképre."],
      gabi: ["A Tudjukki és a JóSzaki igénylésénél a cég telefonján jön egy ellenőrző kód: azt továbbítani Zoltánnak, vagy a regisztrációt közösen, egy telefonhívásban megcsinálni."],
      cost: "0 Ft (JóSzakin egy ajánlatkérés kiküldése 300 kredit)",
      effort: "egyszeri igénylés",
    },
    {
      id: "seo-ugynok",
      group: "ingyenes",
      title: "Keresőoptimalizáló automata a blogra",
      status: "tervezett",
      summary: "Az oldalon már több mint ötven cikk van. Az automata hetente megnézi a Search Console-ban, mely kereséseken áll az oldal a 8–20. helyen, és azokhoz ír vagy bővít cikket.",
      why: "A keresőből jövő érdeklődő ingyenes, és hónapokig hoz.",
      zoltan: ["Heti elemzés, cikkjavaslat, a bevált blog-folyamattal."],
      gabi: [],
      cost: "0 Ft",
      effort: "nincs",
      notes: "Előfeltétel: Search Console bekötve (meres).",
    },

    // ─── Fizetett ─────────────────────────────────────────────
    {
      id: "meta-hirdetes",
      group: "fizetos",
      title: "Facebook/Instagram-hirdetés érdeklődő-űrlappal",
      status: "dontes",
      summary: "Kis napi kerettel, az IKEA-stílusú kreatívokkal. Magyar 2026-os tapasztalat szerint egy érdeklődő 1 500–8 000 Ft; egy 440 000 Ft-os ajtónál még a 10 000 Ft-os érdeklődő is megéri. A Meta 2026 áprilisa óta ad egy parancssori eszközt, amivel automata kezelheti a kampányt.",
      why: "Ez éri el azokat, akik nem keresnek, csak görgetnek, és ez skálázható: ha hoz, lehet növelni.",
      zoltan: ["Kampány felépítése, érdeklődő-űrlap, az érdeklődők azonnali továbbítása Telegramra és e-mailre, Huba utánkérdez.", "Heti kiértékelés, a gyenge hirdetés leállítása automatán."],
      gabi: [
        "Döntés a keretről: javasolt indulás napi 1 500 Ft (kb. 45 000 Ft/hó), egy hónap próba.",
        "Meta Business-fiók és bankkártya megadása a hirdetési fiókhoz (business.facebook.com), vagy Zoltán fiókjáról számlázva, havi elszámolással.",
        "A kreatívok jóváhagyása (lásd az anyagokat).",
      ],
      cost: "45 000–90 000 Ft/hó a saját döntés szerint",
      effort: "heti egy pillantás a számokra",
      materials: ["meme-feszitovas-v1", "prompt-feszitovas", "prompt-auto"],
      notes: "Előfeltétel: Facebook-oldal (facebook-instagram) és a webes érdeklődők kézbesítése (lead-kezbesites).",
    },
    {
      id: "google-ads",
      group: "fizetos",
      title: "Google keresőhirdetés néhány kulcsszóra",
      status: "dontes",
      summary: "„Biztonsági ajtó Budapest”, „panel ajtócsere” és hasonló keresésekre, Budapest és Pest megye, napi 2–3 000 Ft. Új fiókra kupon jár: amennyit az első hetekben elköltünk, annyit ad hozzá a Google.",
      why: "A kereső szándékú vevő a legértékesebb, és a kupon az első 1–2 hónapot félárassá teszi.",
      zoltan: ["Kampány felépítése, kulcsszavak, konverziómérés, automata optimalizálás."],
      gabi: ["Döntés a keretről (javasolt napi 2 000 Ft).", "Google Ads-fiók és fizetési mód a cég nevében, vagy Zoltán fiókjáról havi elszámolással."],
      cost: "60 000–90 000 Ft/hó, az első hónapokban kuponnal kevesebb",
      effort: "nincs",
      notes: "Előfeltétel: mérés (meres) és a webes érdeklődők kézbesítése.",
    },
    {
      id: "qjob-jofogas",
      group: "fizetos",
      title: "Qjob és Jófogás",
      status: "dontes",
      summary: "A Qjob PRO 8 000 Ft/hó, korlátlan ajánlattétellel: az automata figyeli az ajtócsere-feladatokat és ajánlatot ír. A Jófogáson egy szolgáltatás-hirdetés 1 990 Ft.",
      why: "Olcsó, és kész vevők kérnek ott ajánlatot.",
      zoltan: ["Az új feladatok figyelése, ajánlat-szöveg Huba stílusában, Gabi jóváhagyásával vagy anélkül."],
      gabi: ["Döntés: induljon-e (8 000 + 1 990 Ft).", "Regisztráció a cég nevében (telefonos kód)."],
      cost: "kb. 10 000 Ft/hó",
      effort: "nincs",
    },

    // ─── Közvetítők ───────────────────────────────────────────
    {
      id: "kozos-kepviselok",
      group: "b2b",
      title: "Közös képviselők megszólítása",
      status: "dontes",
      summary: "Egy közös képviselő egy házban tíz ajtót is hozhat. 2026. október 31-ig minden közös képviselőnek regisztrálnia kell a földhivatalnál, és a Budapesti Zöld Panelprogram miatt most felújítási üzemmódban vannak. Az automata rövid, személyre szabott e-mailt küld egy útmutatóval.",
      why: "A legnagyobb kar: egy jó kapcsolat sok megrendelés.",
      zoltan: ["Címlista a nyilvános jegyzékekből, útmutató-PDF („Társasházi ajtócsere 2026”), napi 20–30 levél, leiratkozással.", "Válaszok továbbítása Gabinak."],
      gabi: ["Jóváhagyni a levél hangját és hogy Gabi nevében menjen.", "Megmondani, mely kerületek vagy házak a legfontosabbak."],
      cost: "0 Ft",
      effort: "a válaszok megválaszolása",
      notes: "Céges kapcsolattartóknak jogos érdek alapján mehet, de mértékkel és leiratkozással.",
    },
    {
      id: "partnerek",
      group: "b2b",
      title: "Biztosítási alkuszok, lakásfelújítók, ingatlanosok",
      status: "tervezett",
      summary: "A MABISZ-minősített ajtó több biztosítónál feltétel vagy kedvezmény alapja, az alkusz ezért szívesen ajánlja. A felújító cégek és ingatlanosok ajánlás ellenében hoznak vevőt.",
      why: "Olyan vevőt hoz, akit mi nem érnénk el.",
      zoltan: ["Partnerlista és bemutatkozó levél, automata utánkövetéssel."],
      gabi: ["Felsorolni a meglévő partnereket és ismerősöket ezekben a szakmákban.", "Eldönteni, jár-e ajánlási jutalék, és mennyi."],
      cost: "0 Ft + jutalék, ha van",
      effort: "kezdetben néhány telefon",
    },
    {
      id: "zold-panelprogram",
      group: "b2b",
      title: "Cikk és tájékoztató a Budapesti Zöld Panelprogramról",
      status: "tervezett",
      summary: "A program 30% vissza nem térítendő támogatást ad panelházaknak nyílászárócserére is. Azt tisztázni kell, hogy a lakásbejárati ajtó beleférhet-e; a cikk ezt mondja meg őszintén, és a közös képviselői levél apropója lesz.",
      why: "Időszerű téma, keresik, és a közös képviselők ezt olvassák.",
      zoltan: ["A pályázati kiírás átolvasása, cikk a blogra, tájékoztató a közös képviselőknek."],
      gabi: ["Elmondani, volt-e már pályázatból fizetett ajtócseréjük, és mi a tapasztalat."],
      cost: "0 Ft",
      effort: "nincs",
    },
  ];
}

/** What stays with people: nothing here is automated. */
export const NOT_AUTOMATED = [
  "A telefon felvétele és a visszahívás.",
  "A helyszíni felmérés és az árajánlat.",
  "Fotó és rövid videó a műhelyből és a beépítésekről.",
  "A Google-, Facebook- és jegyzék-profilok első igazolása (telefonos kód, levelezőlap).",
];
