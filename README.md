# Huba ajtó — hubaajto.hu

Static-first marketing site for **Szer-X3 Kft. / Huba ajtó** (MABISZ-minősített biztonsági ajtó gyártó, Kistarcsa).
Built with **Astro 6 + Tailwind 4**. The public site is fully prerendered; a single dynamic Node endpoint
(`/api/lead`) handles configurator and contact-form submissions.

Strategic context, copy rules and visual rules live in two files every contributor must read before working:

- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) — voice, palette, tokens, components, blog format.
- [`../HUBAAJTO_REDESIGN_PLAYBOOK.md`](../HUBAAJTO_REDESIGN_PLAYBOOK.md) — the strategic playbook.

## Quick start

```sh
npm install
npm run dev          # → http://localhost:4321
```

## Build and run locally

```sh
npm run build        # produces ./dist with the static site + Node server bundle
npm run start        # serves it on $PORT (default 8080)
```

Smoke-test the lead endpoint:

```sh
curl -X POST http://localhost:4321/api/lead \
  -d "name=Test" -d "phone=06301234567" -d "consent=on" -d "_honey="
# → {"ok":true}
```

## Deploying to Railway

The repo ships with a [`Dockerfile`](./Dockerfile) and [`railway.json`](./railway.json) — Railway picks
those up automatically once you create a service pointing at this directory.

1. Create a Railway project + service from this repo (or use the [`railway`](https://docs.railway.com/) CLI).
2. Add the variables in [`.env.example`](./.env.example) under the service's **Variables** tab.
3. Generate a public domain (Railway dashboard → Settings → Networking).
4. Push to the connected branch — Railway runs the multi-stage Docker build (Node 22 alpine) and the
   `node ./dist/server/entry.mjs` start command.

The Astro Node adapter runs in `standalone` mode, so the container image contains a self-hosted HTTP
server that serves both the prerendered HTML and the dynamic `/api/lead` route. No nginx layer
needed.

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `PUBLIC_SITE_URL` | no | `https://hubaajto.hu` | Used in canonical links and OG meta. |
| `LEAD_DESTINATION_EMAIL` | no | `info@szerx.hu` | Recipient address for the lead pipeline. |
| `RESEND_API_KEY` | no | — | When set, the lead endpoint will (TODO) deliver via Resend. Otherwise it logs to stdout. |
| `PORT` | no (Railway sets it) | `8080` | Server listen port. |
| `HOST` | no | `0.0.0.0` | Server bind host. |

## Folder layout

```
website/
├── astro.config.mjs        # output: static + Node adapter (hybrid: /api/* prerender=false)
├── Dockerfile              # multi-stage: build → small Node 22 alpine runtime
├── railway.json            # Railway build + health-check config
├── package.json            # dev/build/start/preview scripts
├── public/                 # static assets served verbatim (photos, favicons, OG image)
├── src/
│   ├── components/         # reusable Astro components (Hero, Section, ContactCTA, …)
│   ├── content/            # blog posts (markdown + collection schema)
│   ├── data/
│   │   ├── site.ts         # SITE / CONTACT / LOCKS / NAV constants (single source of truth)
│   │   └── configurator-catalogue.ts  # /ajtotervezo catalogue (frame, patterns, locks, MABISZ)
│   ├── layouts/
│   │   ├── BaseLayout.astro  # page shell, schema.org graph, GSAP reveal init
│   │   └── BlogLayout.astro
│   ├── lib/
│   │   └── configurator.ts # /ajtotervezo state machine (vanilla TS module)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── ajtotervezo.astro            # the 9-step image-layered configurator
│   │   ├── biztonsagi-ajto/             # modern-range pillar
│   │   ├── stilus-biztonsagi-ajto.astro
│   │   ├── api/
│   │   │   └── lead.ts                  # POST /api/lead (prerender=false)
│   │   └── blog/
│   ├── scripts/
│   └── styles/
│       └── global.css      # Tailwind + brand tokens (@theme)
└── STYLE_GUIDE.md
```

## /ajtotervezo configurator

Modern image-layered door designer that restores the legacy Flash flow
(see [`../swf/AJTOTERVEZO_DECOMPILE.md`](../swf/AJTOTERVEZO_DECOMPILE.md)) as a Tier-A
vanilla-TS Astro page. Nine steps:

1. Tokszín (frame colour — RAL)
2. Külső borítás típusa (fa / mart)
3. Külső mintázat (35 fa kombináció / 15 mart minta)
4. Külső szín
5. Belső borítás típusa (fa / mart / mint a külső)
6. Belső mintázat
7. Belső szín
8. Zár (Mottura, Abus, Mul-T-Lock, Iseo, Cisa × MABISZ 2./3./4. osztály)
9. Összegzés + ingyenes felmérés foglalása

Catalogue lives in [`src/data/configurator-catalogue.ts`](./src/data/configurator-catalogue.ts);
state machine in [`src/lib/configurator.ts`](./src/lib/configurator.ts). v1 uses CSS swatch
placeholders for the door patterns — swap each option's `swatch` for an `imageUrl` once the
photographed JPGs are migrated from the legacy site.

Submissions go to [`src/pages/api/lead.ts`](./src/pages/api/lead.ts), which validates name +
phone + consent and the `_honey` honeypot, then logs the payload. Wire up Resend in the
TODO block before pointing live traffic at it.
