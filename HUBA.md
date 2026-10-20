# Huba, a weboldal asszisztense

2026-10-20. Lebegő ajtó-ikon minden oldal jobb alsó sarkában („Kérdezze Hubát”). Datolya
(orientfood ERP) mintájára készült, de itt nincs bejelentkezés és nincs adatbázis.

## Mit tud

- **Látogatói mód (alap):** az oldal tartalmából válaszol (keresés + lapolvasás), linkel a lapokra,
  árat csak az oldalon szereplő sávokból mond. Felmérést / ajánlatot / megrendelést vesz fel
  beszélgetve, összefoglalja, megerősítést és adatkezelési hozzájárulást kér, majd **e-mailben
  elküldi a műhelynek** (`send_order`) — Reply-To a látogató címe, a beszélgetésben csatolt képek
  (pl. a mostani ajtó fotója) mellékletként mennek.
- **Megrendelői mód:** ha egy üzenetben szerepel a `HUBA_OWNER_PASSWORD` szó, a beszélgetés végleg
  átvált. A váltást a szerver végzi, nem a modell: a jelszó sem a modellhez, sem az átiratba nem
  kerül (`[jelszó]`). Ilyenkor Huba a módosítási kéréseket veszi fel (`record_request`): a
  `read_page` a lap képeit sorszámmal adja vissza, így a „harmadik kép” azonosítható. Huba maga
  semmit nem módosít.
- **Lezárás:** „Kész” gomb vagy 30 perc csend. Összefoglaló készül (magyar JSON: cím, összefoglaló,
  kategória), és a beszélgetés Alfréd postafiókjába kerül.

## Felépítés

```
HubaWidget.astro ──multipart──▶ /api/huba/conversations/{id}/messages ──▶ Claude (eszközökkel)
  (transition:persist,                    │                 search_site / read_page /
   localStorage: id + token)              │                 send_order (látogató) / record_request (megrendelő)
                                          ▼
                       $HUBA_DATA_DIR/conversations/<id>.json, attachments/<id>/…
                                          │  lezárás → összefoglaló
                                          ▼
   Alfréd (Mac, launchd 5 percenként) ──X-Inbox-Token──▶ GET /api/huba/inbox, …/attachments/{c}/{a}, POST …/{id}/ack
      megrendelői kérés: vault-jegyzet (projects/hubaajto/huba/…) + checkbox a projects/hubaajto.md-ben + Telegram
      látogatói beszélgetés: rövid Telegram-üzenet, elérhetőség nélkül, vault nélkül
      megrendelés, aminek az e-mailje nem ment ki: vault-jegyzet az adatokkal + figyelmeztetés
```

- `src/lib/huba/store.ts` — fájlos tárolás, beszélgetésenkénti zárral (egy Node-folyamat).
- `src/lib/huba/knowledge.ts` — induláskor beolvassa a prerenderelt lapokat (`dist/client/**/index.html`,
  vagy `HUBA_SITE_DIR`), a `<main>` szövegét címsorok szerint szakaszolja, ékezetfüggetlen, 6 betűs
  szótöves kereséssel. A lapok listája a rendszerpromptban van.
- `src/lib/huba/agent.ts` — eszközhurok (max. 8 kör, az utolsó 24 üzenet szövege megy vissza, az aktuális
  üzenet képei/PDF-je blokként), szerveroldali fallback (`fallbacks: "default"`), prompt cache a
  rendszerpromptra. Modell: `HUBA_MODEL` (alap `claude-haiku-5-5`, mint Datolya), `HUBA_EFFORT` (alap `low`).
- `src/lib/huba/service.ts` — jelszóváltás, korlátok (IP-nként 20 beszélgetés/nap, 30 üzenet/10 perc,
  200/nap; beszélgetésenként 60 üzenet; 5 fájl × 10 MB, csak kép és PDF), lezárás, inbox.
- `src/lib/huba/mail.ts` — SMTP (nodemailer). `SMTP_HOST` nélkül nem küld; a megrendelés ilyenkor is
  megmarad, és Alfréd hozza el Zoltánnak továbbításra.
- A kliens a nagy fotókat feltöltés előtt 2000 px-re kicsinyíti (JPEG).
- Bármely lap megnyithatja: `<a href="#huba">` vagy `window.dispatchEvent(new Event("huba:open"))`.

## Élesítés (Railway)

1. Volume a `hubaajto` szolgáltatásra, mount: `/app/data`. A konténer `app` felhasználóként fut, a
   volume pedig root tulajdonú, ezért `RAILWAY_RUN_UID=0` is kell (vagy írhatóvá tenni a volume-ot).
2. Változók: `ANTHROPIC_API_KEY`, `HUBA_OWNER_PASSWORD`, `HUBA_INBOX_TOKEN`, `SMTP_*`, `HUBA_ORDER_TO`.
3. Alfréd: `HUBA_INBOX_URL=https://www.hubaajto.hu/api/huba/inbox` és `HUBA_INBOX_TOKEN` az
   `alfred/.env`-ben; `com.alfred.hubaajtopoll.plist` betöltve.

## Helyi próba

```sh
npm run build
ANTHROPIC_PROFILE=default HUBA_OWNER_PASSWORD=… HUBA_INBOX_TOKEN=test PORT=4321 npm start
```
