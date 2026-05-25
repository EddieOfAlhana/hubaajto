# Huba ajtó — Style Guide for Subagents

**This document is the single source of truth for all subagents building pages or content for the hubaajto.hu rebuild. Every subagent must read this file in full before writing a line. Style drift here = the user redoes work. Don't drift.**

---

## 1. Strategic context (5-second version)

- **Brand**: Huba ajtó (consumer-facing) / Szer-X3 Kft. (legal entity)
- **Workshop**: 2143 Kistarcsa, Nagytarcsai út 6. — family business since 2003, MABISZ-certified since 2009, 15-year structural warranty.
- **Defining differentiator**: makes both **classic / period / műemléki security doors** (kazettás, betétes, festett) AND **modern security doors**. The period range is approvable in Hungarian heritage-protection environments. No competitor offers this dual capability.
- **Strategic moat product**: the **kulcsrakész engedélyezési csomag** — Huba handles the entire 4–6 month, 3-authority Hungarian heritage permitting process so the customer gets one invoice and one project manager.
- **Modern range target**: premium Budapest-agglomeration family houses — Tier 1 east arc (Mogyoród, Csömör, Veresegyház, Gödöllő, Fót — Kistarcsa's backyard), Tier 2 NW Buda agglomeration (Telki, Páty, Budakeszi).

Full strategic playbook: `../HUBAAJTO_REDESIGN_PLAYBOOK.md` (must read before any page work).
Örökségvédelem research (for müemléki content): `../research/06_oroksegvedelem_engedelyezes.md`.
Site context (legacy site content + product specs): `../SITE_CONTEXT.md`.

---

## 2. Voice — non-negotiable rules

**Use önözés (formal Ön / Önök).** Always. Every page, every form, every blog post. The target buyer is 35–65 making a 330k+ HUF investment-grade purchase; formality signals seriousness. All Hungarian competitors in the segment use Ön.

- ✅ "Kérjen ingyenes felmérést!"
- ❌ "Kérj ingyenes felmérést!" — never.

**Calm reassurance, not fear-bait.** Avoid scary "what if you get burgled" copy (Bíborház register). We lead with what we *make* (heritage, craft, security), not what *might happen* to the reader.

**Specific over superlative.** GVH penalises unsupported felsőfok claims under 2008/XLVII.

- ✅ "15 év szerkezeti garancia — a piac leghosszabb vállalása." (defensible)
- ❌ "A legjobb biztonsági ajtó Magyarországon." (not defensible; GVH risk)
- ✅ "MABISZ-minősített 2009 óta" (specific year)
- ❌ "Évek óta tapasztalt szakemberek" (vague)

**Family + workshop voice.** Name the welders. Show the workshop. Refer to "saját üzemünk", "Kistarcsai műhelyünk". Never "csapatunk", "munkatársaink" alone — humanise.

**Approved phrases (use freely):**
- "Saját gyártás Kistarcsán"
- "MABISZ-minősített biztonsági ajtó"
- "Hőhídmentes acél zártszelvény tok"
- "Korhű, az eredeti ajtó alapján rekonstruálva"
- "Ingyenes helyszíni felmérés Budapesten és Pest megyében"
- "Munkanapon belül visszahívjuk"
- "2–3 nap felmérés → 10–12 nap gyártás → 1 nap beépítés"
- "Mottura, Abus, Mul-T-Lock, Iseo, Cisa zárakkal"
- "Az engedélyezést mi intézzük"

**Avoid:**
- "Minőségi", "Megbízható", "Profi" (noise without content)
- "Legjobb", "Vezető" (felsőfok)
- "Olcsó biztonsági ajtó" (wrong positioning)
- "Kínai ajtó" or country-specific attacks (GVH risk under 1996/LVII. § 6)
- Stickered-on patriotism — Hungarian flag = subtle accent only

---

## 3. Visual / Design System

All design tokens live in `src/styles/global.css` (Tailwind 4 `@theme` block). Never hard-code colors, fonts, spacing — always use the tokens.

**Type:**
- Display + headings: **Cormorant Garamond** (transitional serif). Class: `font-family: var(--font-serif)`.
- Body + UI: **Inter** (precise sans). Default body font.
- Letter-spacing: tight for serif headings (`--tracking-tight: -0.01em`), wide for eyebrows / small caps (`--tracking-wide: 0.16em`).

**Color palette — the only colors you may use:**
- `--color-ink` (#0E0F11) — near-black text
- `--color-charcoal` (#2A2D31) — secondary text
- `--color-stone` (#6B6F76) — muted text / labels
- `--color-mist` (#B7BBC1) — disabled / very muted (mostly footer)
- `--color-paper` (#F6F4EE) — warm off-white, the dominant surface
- `--color-cream` (#EEEAE0) — slightly darker paper for alternating sections
- `--color-canvas` (#FFFFFF) — pure white for form inputs only
- `--color-brass` (#B08A4A) — workshop brass, used for hover / accent
- `--color-brass-deep` (#7A5C2C) — link color, em text
- `--color-flag-red` / `-flag-white` / `-flag-green` — flag accent ONLY (use `tricolor-strip` component, never hardcode)

**Do NOT introduce:** new colors, gradients, drop-shadows, bold accent colors beyond brass, or pure black. Stick to the palette.

**Spacing rhythm:**
- Use `--container-max` (1320px) for full-width content
- Use `--container-text` (720px) for prose
- Section padding is handled by the `Section.astro` component — use it, don't roll your own

**Animation:**
- All entrance animations via `.reveal` (single element) or `.stagger` (group of children) — GSAP applies them on viewport entry
- Never use bouncy / overshoot easing. Always `--ease-out-soft` or `--ease-out-expo`
- Duration tokens: `--dur-fast` (220ms for hover), `--dur` (420ms for transitions), `--dur-slow` (720ms for entrance)
- Respect `prefers-reduced-motion` — already handled in global.css

---

## 4. Components — use these, don't reinvent

See `src/components/` for the full set. Key primitives:

| Component | Purpose | When to use |
|---|---|---|
| `<BaseLayout>` | Page shell with header / footer / schema | EVERY page |
| `<Section>` | Standard padded section with eyebrow + heading + lead | Any major content block |
| `<Hero>` | Hero with image, headline, pillars, dual CTA | Top of major pages |
| `<TrustStrip>` | 5-badge MABISZ / warranty / kistarcsa strip | Just after hero on most pages |
| `<ProcessSteps>` | The 4-step 2-3 nap / 10-12 nap / 1 nap pledge | Process explanation pages |
| `<ProductCard>` | Tier card with image / price-from / class badge | Product family pages |
| `<BeforeAfterSlider>` | Draggable before/after | Transformation showcase |
| `<SocialProof>` | Google reviews + 3 testimonials | Trust sections |
| `<SpecCompareTable>` | Huba vs. import katalógusajtó comparison | Anywhere we justify the price |
| `<EngedelyezesiCsomag>` | The 11-step heritage permitting visualization | Only on /engedelyezesi-csomag and home |
| `<LockBrandWall>` | Mottura · Abus · Mul-T-Lock · Iseo · Cisa | Trust-building sections |
| `<ServiceArea>` | District + town list grid | Service area pages |
| `<FAQ>` | Accordion with FAQPage schema | Bottom of most pages |
| `<ContactCTA>` | Closing CTA section (dark or paper) | Bottom of EVERY page |
| `<LeadForm>` | Multi-step quote form (full or callback) | /kapcsolat, /felmeres |
| `<CookieBanner>` | NAIH-compliant cookie consent | Already included in BaseLayout? No — include manually on top-level pages or move to layout |
| `<Stat>` | Big-number stat callout | About / quality sections |

**Pattern for a typical page:**
```astro
<BaseLayout title="..." description="...">
  <Hero ... />
  <TrustStrip />
  <Section tone="paper" eyebrow="..." heading="...">
    [content here]
  </Section>
  <Section tone="cream" eyebrow="..." heading="...">
    [more content]
  </Section>
  ... etc, alternate tone="paper" / tone="cream" ...
  <FAQ items={...} />
  <ContactCTA />
</BaseLayout>
```

**Always alternate `tone="paper"` and `tone="cream"` between sections** — gives the rhythmic editorial layout we want.

---

## 5. Imagery rules

All hero photos are already processed and live in `public/assets/photos/hero/`:

- `period-yellow.jpg` — yellow period door with iron grilles (Buda közép luxury)
- `period-green.jpg` — forest green period door diamond grille (Buda közép)
- `period-double-leaf.jpg` — yellow double-leaf period door (archive star)
- `period-brown.jpg` — brown period door iron filigree
- `period-restoration.jpg` — stripped wood door under restoration (PROOF SHOT)
- `modern-white.jpg` — white modern door in period archway
- `modern-anthracite.jpg` — anthracite modern door, agglomeration family house
- `workshop.jpg` — Kistarcsa workshop with craftsman + finished door
- `before-old-door.jpg` — illustrative old panel-lakás door (before-after only)

**Use these images for hero / showcase use. Do NOT generate new photos for showcase positions.** If a section needs additional supporting imagery, use a different real one from the list OR generate ONE additional image with strict prompt rules (see §6).

**Image alt text MUST be in Hungarian** and describe both the door and the context.

**Image use map** (canonical assignments):
- Homepage hero: `period-yellow.jpg`
- /stilus-biztonsagi-ajto hero: `period-double-leaf.jpg`
- /muemleki-biztonsagi-ajto hero: `period-restoration.jpg` (the proof-of-capability shot)
- /engedelyezesi-csomag hero: `period-green.jpg`
- /biztonsagi-ajto (modern category) hero: `modern-anthracite.jpg`
- /rolunk hero: `workshop.jpg`
- /referenciak: gallery using all of the above
- Before/After component: `before-old-door.jpg` → `period-yellow.jpg` or similar

---

## 6. Generating additional images (blog headers, etc.)

If your subagent needs to generate blog header images via gpt-image-2, follow these rules to prevent style drift:

**Mandatory prompt prefix** (use verbatim at the start of every image prompt):
```
Architectural-quality documentary photograph. Premium Hungarian heritage brand photography
register. Warm but slightly desaturated color grade (similar to RAL 6009 / 8014 tones).
Soft natural daylight. No logos visible, no readable signage or text, no people's faces,
no identifiable customer details. Editorial residential / craft register matching Carl Hansen
or Mumford & Wood brand photography.
```

**Then append the specific scene description.** Keep the scene description focused on one subject.

**For blog header images:** aspect ratio `1536x1024` (16:10 landscape).
**For hero / portrait shots:** aspect `1024x1536` (4:5-ish).

**After generation, you MUST visually inspect by reading the file**, and reject if:
- Any text/letters appear in the image (gpt-image-2 hallucinates Hungarian poorly)
- Identifiable faces appear
- Color grade clashes with the existing hero set (too saturated, too warm, too cold)
- The door (if shown) looks like a different style from what was prompted

Output PNG files into `public/assets/blog/<post-slug>.png`. Run them through PIL color-grade (see `src/scripts/process_hero_photos.py`) to align with the hero look.

**Budget**: ~$0.04 per gpt-image-2 image. Use sparingly. Blog posts can also use cropped versions of existing hero photos as headers — that's preferred over generating fresh.

---

## 7. Hungarian copy rules

**Numbers / formatting:**
- Phone: `+36 30 740 4458` (with `tel:+3630 740 4458` href, no spaces in href)
- Prices: `330 000 Ft` (thin space as thousands separator, "Ft" not "HUF" on consumer pages)
- Hours: `H–P 8:00–17:00` (en-dash for day ranges)
- Address: `2143 Kistarcsa, Nagytarcsai út 6.` (postal code first)
- Dates: `2024. március 12.` (Hungarian convention)

**Punctuation:**
- Use proper Hungarian double quotes: „ ... " (low-high, NOT straight " ")
- Use en-dash for ranges (–), em-dash for parentheticals (—)
- "ÁFA" not "ÁFÁ"
- "MABISZ" all caps

**SEO keywords to weave in naturally** (per pillar — see playbook §7.1 + §10):
- Pillar Stílus/Műemléki: `műemléki biztonsági ajtó`, `stílus biztonsági ajtó`, `kazettás biztonsági ajtó`, `korhű biztonsági ajtó`, `polgári lakás biztonsági ajtó`, `örökségvédelmi engedély ajtó`
- Pillar Prémium családi ház: `biztonsági ajtó családi házhoz`, `prémium bejárati ajtó`, `bejárati ajtó új építésű ház`, `biztonsági ajtó Budakeszi/Telki/Mogyoród`
- Pillar Tudnivalók: `MABISZ minősített ajtó`, `RC2 RC3 RC4 biztonsági ajtó`, `betörésvédelmi osztályok`
- Pillar Árak: `biztonsági ajtó árak`, `mennyibe kerül egy biztonsági ajtó`
- Pillar Beépítés: `régi ajtó cseréje biztonságira`, `panel lakás bejárati ajtó csere`, `társasházi biztonsági ajtó`

---

## 8. Blog post format

Blog posts live in `src/content/blog/*.md` (or `.mdx`).

**Required frontmatter:**
```yaml
---
title: "Post title here"
description: "120-160 char meta description"
publishDate: 2024-09-12  # YYYY-MM-DD. Past dates = published, future = scheduled (excluded from build)
updatedDate: 2025-04-03  # optional
pillar: muemleki  # one of: muemleki, premium-csaladi, tudnivalok, arak, beepites, helyi
tags: ["műemléki", "engedélyezés", "Józsefváros"]
heroImage: "/assets/photos/hero/period-double-leaf.jpg"  # use existing where possible
heroImageAlt: "Korhű kétszárnyú biztonsági ajtó polgári lakásban"
cornerstone: true  # true for the 5 pillar posts only
readingMinutes: 8
seo:
  title: "Optional SEO title override (60 chars)"
  description: "Optional meta description override"
  keywords: ["műemléki biztonsági ajtó", "örökségvédelmi engedély"]
---
```

**Pillar values (exactly these strings):**
- `muemleki` — Stílus / Műemléki cluster
- `premium-csaladi` — Prémium családi ház cluster
- `tudnivalok` — Educational (MABISZ, RC, garancia)
- `arak` — Pricing / financing
- `beepites` — Process / panel / társasház
- `helyi` — Geographic / Budapest district / agglomeration

**Body structure for 1500-2000 word cornerstone posts:**
1. Hook paragraph — 2-3 sentences setting up the reader's situation
2. H2: the core question (e.g., "Mikor kell engedély az ajtócseréhez?")
3. H2: the structured answer (multiple H3 sections)
4. H2: practical examples / scenarios
5. H2: a tabled summary / costs / timelines
6. H2: "Mit ajánlunk Huba ajtóként?" — natural sales bridge
7. Closing CTA

**Body structure for 500-800 word shorter posts:** intro + 2-3 H2 sections + closing CTA.

**Every post ends with:** a one-paragraph soft CTA that suggests "kérje ingyenes helyszíni felmérésünket" or "induljon az ajtótervezővel". Never aggressive sales language.

**Internal linking:** Each post must link to at least 2 relevant /pages and 1 other /blog/post if appropriate. Use the playbook §4 sitemap as the link target list.

---

## 9. Scheduling logic

Posts with `publishDate <= today` are built and visible. Posts with `publishDate > today` are excluded from the static build (handled in `src/pages/blog/[...slug].astro` and `src/pages/blog/index.astro`). You can freely put future dates on posts — they'll appear when the date arrives.

**Schedule:** spread the 25 posts across realistic past/future dates:
- 18 posts in the past (over the last 12 months), simulating an established blog
- 7 posts in the future (next 3-6 months), pre-scheduled

---

## 10. Quality bar

Every page subagent ships must:
- ✅ Use `<BaseLayout>` with proper title + description
- ✅ Open with a `<Hero>` or `<Section>` (no orphaned content)
- ✅ End with `<ContactCTA />` (call to action at the bottom)
- ✅ Use the design tokens — no hardcoded colors / fonts / spacing
- ✅ Be entirely in Hungarian (önözés)
- ✅ Include `.reveal` or `.stagger` classes on major content blocks for the GSAP animations
- ✅ Reference real strings from `src/data/site.ts` (CONTACT, SITE, SLA, LOCKS, SERVICE_AREA)
- ✅ Build successfully (`npm run build` from `website/`)
- ✅ Have a logical heading hierarchy (one H1 per page = the hero, then H2/H3)

Pages without an assigned hero photo: use the existing image library. Don't generate new hero photos.

---

## 11. Final checklist before declaring done

Subagents must end their work by:
1. Running `cd "/Users/hu900676/repos/projects/hubaajto/Huba ajtó/website" && npm run build 2>&1 | tail -20` and confirming the build passes with no errors related to your pages
2. Listing the exact files you created (paths)
3. Listing any decisions or assumptions you made that the main orchestrator should know
4. Listing any files you would have created but didn't (because they're out of scope or need follow-up)
