/**
 * What Huba knows: the site itself. At first use it reads every prerendered page
 * (dist/client/**\/index.html, or $HUBA_SITE_DIR), keeps the <main> text with its headings,
 * the images in page order (owner requests say "the third photo on this page"), and splits
 * the text into sections for a simple accent-insensitive lexical search, like Datolya's.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type Page = {
  path: string;
  title: string;
  text: string;
  images: { src: string; alt: string }[];
};

type Section = { page: Page; heading: string; text: string; terms: Map<string, number> };

const SITE_DIR = path.resolve(process.env.HUBA_SITE_DIR || "dist/client");
const SKIP = [/^\/api\b/, /^\/404/, /^\/admin/];

let cache: Promise<{ pages: Page[]; sections: Section[] }> | null = null;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…" };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? decode(m[1]) : "";
}

/** HTML of <main> to plain text with Markdown-ish headings, list items and links. */
function toText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Number(level))} ${inner.replace(/<[^>]+>/g, " ").trim()}\n\n`)
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<(br|\/p|\/div|\/tr|\/section|\/article|\/details|\/summary|\/dd|\/dt)\b[^>]*>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function fold(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Accent-free words, cut to a six-letter stem so "ajtót", "ajtók", "ajtóinkat" meet. */
export function terms(s: string): string[] {
  return (fold(s).match(/[a-z0-9]{2,}/g) ?? []).map((w) => w.slice(0, 6));
}

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "_astro" || e.name === "assets") continue;
      out.push(...(await htmlFiles(full)));
    } else if (e.name === "index.html") {
      out.push(full);
    }
  }
  return out;
}

async function build() {
  const pages: Page[] = [];
  for (const f of await htmlFiles(SITE_DIR)) {
    const rel = path.relative(SITE_DIR, path.dirname(f)).split(path.sep).join("/");
    const pagePath = "/" + rel;
    if (SKIP.some((r) => r.test(pagePath))) continue;
    const html = await readFile(f, "utf8");
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
    if (!main) continue;
    const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? pagePath).trim();
    const images = [...main.matchAll(/<img\b[^>]*>/gi)]
      .map((m) => ({ src: attr(m[0], "src"), alt: attr(m[0], "alt") }))
      .filter((i) => i.src);
    pages.push({ path: pagePath === "/" ? "/" : pagePath.replace(/\/$/, ""), title, text: toText(main), images });
  }
  pages.sort((a, b) => a.path.localeCompare(b.path));

  const sections: Section[] = [];
  for (const page of pages) {
    const parts = page.text.split(/\n(?=#{1,3} )/);
    for (const part of parts) {
      const heading = part.match(/^#{1,3} (.*)/)?.[1] ?? page.title;
      const counts = new Map<string, number>();
      for (const t of terms(`${page.title} ${heading} ${heading} ${part}`)) counts.set(t, (counts.get(t) ?? 0) + 1);
      sections.push({ page, heading, text: part, terms: counts });
    }
  }
  if (!pages.length) console.warn(`[huba] no prerendered pages under ${SITE_DIR} — run \`npm run build\` first`);
  return { pages, sections };
}

function load() {
  cache ??= build();
  return cache;
}

export async function pages(): Promise<Page[]> {
  return (await load()).pages;
}

export async function page(p: string): Promise<Page | null> {
  const wanted = "/" + p.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "");
  return (await load()).pages.find((x) => x.path === wanted) ?? null;
}

export async function search(query: string, limit = 6) {
  const { sections } = await load();
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const df = new Map<string, number>();
  for (const t of q) df.set(t, sections.filter((s) => s.terms.has(t)).length);
  const n = sections.length || 1;
  return sections
    .map((s) => {
      let score = 0;
      let hits = 0;
      for (const t of q) {
        const tf = s.terms.get(t) ?? 0;
        if (!tf) continue;
        hits++;
        score += (1 + Math.log(tf)) * Math.log(1 + n / (df.get(t) || 1));
      }
      return { s, score: score * (hits / q.length) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => ({
      path: s.page.path,
      pageTitle: s.page.title,
      heading: s.heading,
      excerpt: s.text.length > 1200 ? s.text.slice(0, 1200) + " …" : s.text,
    }));
}

/** One line per page for the system prompt, so Huba can link without searching. */
export async function siteMap(): Promise<string> {
  return (await pages()).map((p) => `- ${p.path} — ${p.title.replace(/\s*[|·–—-]\s*Huba ajtó.*$/i, "")}`).join("\n");
}
