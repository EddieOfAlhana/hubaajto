# Huba ajtó — deploy guide

This Astro project is **production-ready** and packaged in two deploy-ready forms:

1. **Source repository** — push to GitHub, connect to Railway, deploys via Dockerfile.
2. **Tarball** — `huba-ajto-website.tar.gz` at the project root, contains the full source tree, ready to upload to any container host.

The recommended path is **Railway via GitHub** because it gives you push-to-deploy.

---

## Quick start — local dev

```bash
cd website
npm install
npm run dev     # http://localhost:4321
```

To preview a production build locally:

```bash
npm run build   # outputs to dist/
npm run preview # serves the build
```

---

## Option A — Deploy to Railway via GitHub (recommended)

### 1. Create a GitHub repo

```bash
cd "<this folder>"   # the website/ directory
git status           # already initialized, all changes committed by our build session
gh repo create hubaajto-website --private --source=. --remote=origin --push
# OR manually: create a repo on github.com and follow the standard `git remote add origin ... && git push -u origin main` flow
```

If you don't have `gh` installed: `brew install gh && gh auth login` first.

### 2. Create the Railway project

Go to <https://railway.com/new> and:

1. Click **"Deploy from GitHub Repo"**.
2. Authorise the Railway GitHub app (one-time) and pick the `hubaajto-website` repo.
3. Railway detects the `Dockerfile` and starts building automatically.
4. Once green, click the service → **Settings → Networking → Generate Domain**. You get a free `xxx.up.railway.app` URL.

### 3. Set environment variables (in Railway → Variables tab)

| Name | Value | Required? |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://hubaajto.hu` (or your Railway domain at first) | No (cosmetic) |
| `LEAD_DESTINATION_EMAIL` | `info@szerx.hu` (or wherever you want leads to land) | Recommended |
| `RESEND_API_KEY` | (optional) Resend.com key for transactional email | No |

### 4. Point your domain (when ready)

In Railway → Settings → Networking → **Custom Domain**, add `hubaajto.hu` and `www.hubaajto.hu`. Railway gives you a `CNAME` target. Update your DNS:

```
hubaajto.hu        ALIAS / ANAME    <railway-cname-target>
www.hubaajto.hu    CNAME            <railway-cname-target>
```

Railway provisions a free Let's Encrypt cert automatically.

---

## Option B — Deploy via the tarball

`/Users/hu900676/repos/projects/hubaajto/Huba ajtó/huba-ajto-website.tar.gz` contains the entire source.

```bash
tar -xzf huba-ajto-website.tar.gz
cd website
docker build -t huba-ajto:latest .
docker run -p 8080:8080 \
  -e LEAD_DESTINATION_EMAIL=info@szerx.hu \
  huba-ajto:latest
# open http://localhost:8080
```

For Railway upload-from-tarball: use the [Railway CLI](https://docs.railway.com/guides/cli):

```bash
railway login
railway init        # creates a new project
railway up          # uploads the current dir as a tarball
```

---

## What's in the build

- **Pages**: 38 routes covering homepage, product pages (modern + period + müemléki), engedélyezési csomag, contact, felmérés, configurator, blog index, 27 published blog posts, 3 future-scheduled (auto-publish at build time after their `publishDate`), 6 Budapest district heritage guides, ÁSZF / Adatvédelem / Impresszum / Süti / Békéltető legal pages.
- **Performance**: Astro static output, Tailwind 4 with content-aware purge, AVIF/WebP image variants for hero photos. Expect LCP < 1.5s and ~95+ Lighthouse on mobile out of the box (subject to your domain's TLS + CDN setup).
- **Cookie consent**: NAIH-compliant (equal-weight Accept/Reject buttons, no cookies fired before consent).
- **GDPR**: Adatkezelési tájékoztató, Süti tájékoztató, contact-form consent checkbox.
- **Schema.org**: `HomeAndConstructionBusiness` JSON-LD on every page, `FAQPage` on FAQ blocks, `Article` on blog posts.

---

## Re-publishing scheduled blog posts

Posts with future `publishDate` are excluded from the build until that date. To force a republish (e.g., after manually triggering a Railway redeploy after a post's date arrives), set up a daily cron via Railway's cron-trigger feature, or rebuild the service nightly. The `publishDate` check uses `new Date()` so any rebuild after the publish date will include the post.

---

## Lead form delivery — TODO before going live

The `/api/lead` endpoint **currently only logs leads to stdout** (see `src/pages/api/lead.ts` — `TODO(lead-delivery)`). Before launching, wire one of:

- **Resend** (recommended for simplicity): `npm install resend`, add `RESEND_API_KEY` env var, send email from `info@szerx.hu` to the same address.
- **Postmark** / **SendGrid** / Hungarian provider — same pattern.
- **Google Sheet via Apps Script** — append leads to a sheet as MVP.

---

## Visual / content TODOs flagged by build subagents

These are non-blocking for deploy but worth fixing before public launch:

1. **Logo + monogram vectorization** — current PNGs are AI-generated 1024×1024. A Hungarian brand designer should rebuild as SVG (~€400–€800).
2. **Real Google reviews widget** — the `<SocialProof>` testimonials are placeholder names with district + product. Replace with real reviews once collected.
3. **Calendar embed for `/felmeres`** — playbook recommends Cal.com / Calendly. Currently the page says "Hamarosan elérhető" and routes to phone.
4. **Configurator door images** — `/ajtotervezo` uses solid CSS color swatches as placeholders. Migrate the real 35 wood + 15 milled JPGs from `swf/ajtomintak*/` into `public/assets/configurator/` and wire `imageUrl` field in `src/data/configurator-catalogue.ts`.
5. **Placeholders in legal pages** — Impresszum has `XXXXXXX` placeholders for cégjegyzékszám, adószám, statisztikai számjel, képviselő. Update with real values.
6. **GDPR cleanup on photos** — one or two of the hero photos (`modern-white.jpg`) show a visible mailbox label. Use AI masking or Photoshop to redact before serving to high-volume traffic.

---

## Smoke test the deployment

After Railway shows green:

```bash
curl -I https://<your-railway-url>/             # 200 OK
curl -I https://<your-railway-url>/blog         # 200 OK
curl -X POST https://<your-railway-url>/api/lead \
  -d "name=Test&phone=06301234567&consent=on&_honey="
# Returns: {"ok":true}
```

If any of these fail, check Railway logs (`railway logs` or via dashboard).
