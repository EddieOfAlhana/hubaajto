/**
 * Huba's model calls: the tool loop for one visitor message, and the summary at close.
 *
 * Same shape as Datolya (orientfood/erp-backend, package assistant): the stored history is text
 * only, the current message carries its images/PDFs, and the tools run on the server. The model
 * and effort come from HUBA_MODEL / HUBA_EFFORT (default: Datolya's Claude Haiku 5.5 at low effort).
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { GROUP_HU, MATERIALS, NOT_AUTOMATED, STATUS_HU, marketingPlan, type Group } from "../../data/marketing-plan";
import * as knowledge from "./knowledge";
import * as mail from "./mail";
import { customerSystem, ownerSystem, SUMMARY } from "./prompt";
import { attachmentsOf, readAttachment, type AttachmentMeta, type Conversation } from "./store";

const MODEL = process.env.HUBA_MODEL || "claude-haiku-5-5";
const EFFORT = (process.env.HUBA_EFFORT || "low") as "low" | "medium" | "high";
const MAX_ROUNDS = 8;
const HISTORY = 24;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MAIL_ATTACHMENTS = 20 * 1024 * 1024;

let client: Anthropic | null = null;

/** Huba shows up only with a credential; HUBA_ENABLED=false hides it anyway. */
export function enabled(): boolean {
  if (process.env.HUBA_ENABLED === "false") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

function api(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 90_000 });
  return client;
}

export type Upload = AttachmentMeta & { data: Buffer };
export type PageInfo = { path?: string; title?: string };

// ─── Tools ────────────────────────────────────────────────────────

const SEARCH: BetaTool = {
  name: "search_site",
  description:
    "Keresés a hubaajto.hu oldal teljes szövegében (termékek, árak, garancia, folyamat, műemléki engedélyezés, blog, GYIK, kapcsolat). " +
    "Ékezet nélkül is működik. A legjobb szakaszokat adja vissza a lap útvonalával.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Kulcsszavak, pl. 'műemléki engedély határidő' vagy 'garancia'" } },
    required: ["query"],
  },
};

const READ: BetaTool = {
  name: "read_page",
  description: "Egy lap teljes szövege és a rajta lévő képek sorrendben (sorszám, forrás, alt szöveg). Útvonal pl. '/arak' vagy '/blog/mennyibe-kerul-biztonsagi-ajto-2026'.",
  input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
};

const ORDER: BetaTool = {
  name: "send_order",
  description:
    "Elküldi a látogató felmérés-, ajánlat- vagy megrendelés-kérését e-mailben a műhelynek, a beszélgetésben csatolt képekkel együtt. " +
    "Csak akkor hívd, ha a látogató megerősítette az összefoglalót és hozzájárult az adatkezeléshez.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "A látogató neve" },
      phone: { type: "string" },
      email: { type: "string", description: "Ha megadta" },
      location: { type: "string", description: "Település + kerület vagy irányítószám" },
      address: { type: "string", description: "Pontos cím, ha megadta" },
      request: { type: "string", description: "Mit szeretne: ajtótípus, lakás/társasház/családi ház, csere vagy új, felmérés vagy ajánlat — önálló, érthető leírás" },
      current_door: { type: "string", description: "A jelenlegi ajtó leírása (anyag, állapot, és mi látszik a fotón)" },
      size: { type: "string", description: "Hozzávetőleges nyílásméret" },
      heritage: { type: "string", description: "Műemléki / helyi védettség, ha szóba került" },
      lock: { type: "string", description: "Zárpreferencia" },
      timeline: { type: "string", description: "Mikorra kellene" },
      callback_time: { type: "string", description: "Mikor hívhatják" },
      questions: { type: "string", description: "Nyitott kérdések, amikre Huba nem tudott válaszolni" },
      consent: { type: "boolean", description: "true, ha a látogató kifejezetten hozzájárult az adatkezeléshez" },
    },
    required: ["name", "phone", "location", "request", "consent"],
  },
};

const REQUEST: BetaTool = {
  name: "record_request",
  description:
    "Rögzít egy módosítási kérést a weboldal tulajdonosától Zoltánnak (fejlesztő). Önálló, pontos leírás kell: lap, elem, jelenlegi állapot, kívánt állapot, csatolt fájl.",
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["KEP", "SZOVEG", "UJ_TARTALOM", "HIBA", "FUNKCIO", "MARKETING", "EGYEB"], description: "KEP = képcsere/új kép, SZOVEG = szövegmódosítás, UJ_TARTALOM = új lap/blogposzt, HIBA, FUNKCIO = új funkció, MARKETING = marketing-döntés vagy Gabi által elvégzett marketing-lépés (a terv frissítéséhez), EGYEB" },
      title: { type: "string", description: "Rövid cím, max. 80 karakter" },
      description: { type: "string" },
      page_path: { type: "string", description: "Az érintett lap útvonala" },
      attachment_names: { type: "array", items: { type: "string" }, description: "A kéréshez tartozó csatolt fájlok neve" },
    },
    required: ["kind", "title", "description"],
  },
};

const MARKETING: BetaTool = {
  name: "marketing_plan",
  description:
    "A Huba ajtó marketing-terve a tulajdonosnak: mi hozna megrendelést, mi készült el, mi van Zoltánnál, mi vár Gabira, mi vár döntésre, és a már elkészült anyagok (kreatívok, promptok). " +
    "Paraméter nélkül az áttekintést adja; az `item` egy tétel azonosítójával a részleteket (Gabi lépései, költség, anyagok); `item: \"anyagok\"` az anyagok listáját.",
  input_schema: {
    type: "object",
    properties: { item: { type: "string", description: "Tétel azonosítója az áttekintésből (pl. 'gbp'), vagy 'anyagok'" } },
  },
};

function materialsText(ids?: string[]): string {
  const list = ids ? MATERIALS.filter((m) => ids.includes(m.id)) : MATERIALS;
  if (!list.length) return "(nincs anyag)";
  return list
    .map((m) => `- ${m.title} — ${m.kind === "kep" ? `kép, megmutatható: ![${m.title}](${m.src})` : `szöveg, link: [${m.title}](${m.src})`}\n  ${m.note}`)
    .join("\n");
}

function marketingText(item: string): string {
  const plan = marketingPlan();
  if (item === "anyagok") return `# Elkészült anyagok\n${materialsText()}`;
  if (item) {
    const it = plan.find((x) => x.id === item);
    if (!it) return `HIBA: nincs ilyen tétel: ${item}. Azonosítók: ${plan.map((x) => x.id).join(", ")}, vagy 'anyagok'.`;
    return [
      `# ${it.title}`,
      `Azonosító: ${it.id} · Állapot: ${STATUS_HU[it.status]} · Költség: ${it.cost} · Emberi munka, ha már megy: ${it.effort}`,
      "",
      it.summary,
      "",
      `Miért fontos: ${it.why}`,
      "",
      "Zoltán (és az automaták) dolga:",
      ...it.zoltan.map((s) => `- ${s}`),
      "",
      it.gabi.length ? "Gabi lépései, sorban:" : "Gabinak nincs vele teendője.",
      ...it.gabi.map((s, i) => `${i + 1}. ${s}`),
      it.notes ? `\nMegjegyzés: ${it.notes}` : "",
      it.materials?.length ? `\nAnyagok:\n${materialsText(it.materials)}` : "",
    ].join("\n");
  }
  const groups = ["alap", "ingyenes", "fizetos", "b2b"] as Group[];
  const lines = [
    "# Marketing-terv — áttekintés (naprakész állapotokkal)",
    "A cél: megrendelés, minél kevesebb emberi munkával, ingyen vagy olcsón. A háttér: három úton jön vevő — aki keres (Google), aki görget (Facebook/Instagram/videó), és akit közvetítő hoz (közös képviselő, alkusz, felújító).",
    "",
  ];
  for (const g of groups) {
    lines.push(`## ${GROUP_HU[g]}`);
    for (const it of plan.filter((x) => x.group === g)) {
      lines.push(`- [${it.id}] ${it.title} — ${STATUS_HU[it.status]}${it.gabi.length ? ` — Gabi teendője van (${it.gabi.length} lépés)` : ""} · ${it.cost}\n  ${it.summary}`);
    }
    lines.push("");
  }
  lines.push("## Amit nem automatizálunk", ...NOT_AUTOMATED.map((s) => `- ${s}`), "", `## Elkészült anyagok (${MATERIALS.length})`, materialsText());
  return lines.join("\n");
}

async function readPage(p: string): Promise<string> {
  const page = await knowledge.page(p);
  if (!page) return `Nincs ilyen lap: ${p}. Nézd meg a lapok listáját a rendszerpromptban, vagy keress (search_site).`;
  const images = page.images.map((img, i) => `${i + 1}. ${img.src}${img.alt ? ` — alt: „${img.alt}”` : ""}`).join("\n");
  const text = page.text.length > 14000 ? page.text.slice(0, 14000) + "\n…(a lap folytatódik)" : page.text;
  return `# ${page.title}\nÚtvonal: ${page.path}\n\n${text}\n\n## Képek a lapon (sorrendben)\n${images || "(nincs)"}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const ORDER_LABELS: [string, string][] = [
  ["name", "Név"], ["phone", "Telefon"], ["email", "E-mail"], ["location", "Helyszín"], ["address", "Cím"],
  ["request", "Kérés"], ["current_door", "Jelenlegi ajtó"], ["size", "Méret"], ["heritage", "Védettség"],
  ["lock", "Zár"], ["timeline", "Határidő"], ["callback_time", "Visszahívás"], ["questions", "Nyitott kérdések"],
];

async function sendOrder(input: Record<string, unknown>, conversation: Conversation): Promise<string> {
  const f: Record<string, string> = {};
  for (const [key] of ORDER_LABELS) {
    const v = input[key];
    if (typeof v === "string" && v.trim()) f[key] = v.trim().slice(0, 2000);
  }
  const missing = ["name", "phone", "location", "request"].filter((k) => !f[k]);
  if (missing.length) return `HIBA: hiányzik: ${missing.join(", ")}. Kérdezd meg a látogatótól.`;
  if ((f.phone.match(/\d/g) ?? []).length < 7) return "HIBA: a telefonszám túl rövid, kérd el újra.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "HIBA: az e-mail cím formátuma hibás, kérd el újra.";
  if (input.consent !== true) return "HIBA: a látogató még nem járult hozzá az adatkezeléshez. Kérdezd meg, mutasd meg az /adatvedelem linket.";
  const fingerprint = JSON.stringify(f);
  if (conversation.orders.some((o) => JSON.stringify(o.fields) === fingerprint && !o.emailStatus.startsWith("failed")))
    return "Ez a megrendelés már el lett küldve ebben a beszélgetésben — ne küldd újra.";

  const files: mail.MailAttachment[] = [];
  let total = 0;
  for (const a of attachmentsOf(conversation)) {
    const data = await readAttachment(conversation.id, a.id);
    if (!data || total + data.length > MAX_MAIL_ATTACHMENTS) continue;
    total += data.length;
    files.push({ filename: a.fileName, contentType: a.contentType, content: data });
  }

  const rows = ORDER_LABELS.filter(([k]) => f[k]);
  const text = [
    "Új megkeresés érkezett a hubaajto.hu oldalról, Huba (a weboldal asszisztense) vette fel a látogatóval beszélgetve.",
    "",
    ...rows.map(([k, label]) => `${label}: ${f[k]}`),
    "",
    files.length ? `Csatolva: ${files.map((x) => x.filename).join(", ")}` : "Csatolmány nincs.",
    "",
    f.email ? "Erre a levélre válaszolva közvetlenül a látogatónak ír." : "A látogató nem adott meg e-mail címet — telefonon érhető el.",
    "A látogató hozzájárult, hogy adatait a megkeresés intézésére kezeljük (adatvédelmi tájékoztató: https://www.hubaajto.hu/adatvedelem).",
  ].join("\n");
  const html =
    `<p>Új megkeresés érkezett a <b>hubaajto.hu</b> oldalról — Huba, a weboldal asszisztense vette fel a látogatóval beszélgetve.</p>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
    rows.map(([k, label]) => `<tr><td style="color:#6B6F76;vertical-align:top;white-space:nowrap">${label}</td><td>${esc(f[k]).replace(/\n/g, "<br>")}</td></tr>`).join("") +
    `</table><p>${files.length ? `Csatolva: ${files.map((x) => esc(x.filename)).join(", ")}` : "Csatolmány nincs."}</p>` +
    `<p style="color:#6B6F76;font-size:12px">${f.email ? "Erre a levélre válaszolva közvetlenül a látogatónak ír." : "A látogató nem adott meg e-mail címet — telefonon érhető el."} ` +
    `A látogató hozzájárult adatai kezeléséhez a megkeresés intézésére.</p>`;

  let status: string;
  try {
    status = await mail.send({
      to: mail.orderRecipient(),
      subject: `Új megkeresés (Huba): ${f.name}, ${f.location}`,
      text,
      html,
      replyTo: f.email,
      attachments: files,
    });
  } catch (e) {
    status = `failed: ${(e as Error).message}`.slice(0, 300);
    console.error("[huba] order mail failed", e);
  }
  conversation.orders.push({ createdAt: new Date().toISOString(), fields: f, attachments: files.map((x) => x.filename), emailStatus: status });
  if (status === "sent") return `Elküldve a műhelynek (${files.length} csatolmánnyal).`;
  // Not sent by mail: the order is kept and Alfred brings it to Zoltán, who forwards it.
  return "Rögzítve; a műhely munkatársai megkapják és munkanapon belül jelentkeznek.";
}

function recordRequest(input: Record<string, unknown>, conversation: Conversation, page: PageInfo): string {
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!title || !description) return "HIBA: cím és leírás kell.";
  const names = Array.isArray(input.attachment_names) ? input.attachment_names.map(String) : [];
  const known = new Set(attachmentsOf(conversation).map((a) => a.fileName));
  conversation.requests.push({
    kind: String(input.kind ?? "EGYEB"),
    title: title.slice(0, 120),
    description: description.slice(0, 4000),
    pagePath: typeof input.page_path === "string" && input.page_path ? input.page_path : page.path,
    attachments: names.filter((n) => known.has(n)),
    createdAt: new Date().toISOString(),
  });
  const unknown = names.filter((n) => !known.has(n));
  return `Rögzítve (${conversation.requests.length}. kérés ebben a beszélgetésben).` + (unknown.length ? ` Ismeretlen csatolmánynév: ${unknown.join(", ")} — a beszélgetésben lévők: ${[...known].join(", ") || "nincs"}.` : "");
}

async function execute(name: string, input: Record<string, unknown>, conversation: Conversation, page: PageInfo): Promise<string> {
  switch (name) {
    case "search_site": {
      const hits = await knowledge.search(String(input.query ?? ""));
      return hits.length ? JSON.stringify(hits) : "Nincs találat. Próbálj más kulcsszót, vagy nézd meg a lapok listáját.";
    }
    case "read_page":
      return readPage(String(input.path ?? ""));
    case "send_order":
      if (conversation.mode !== "customer") return "HIBA: megrendelői módban nincs megrendelés-küldés.";
      return sendOrder(input, conversation);
    case "record_request":
      if (conversation.mode !== "owner") return "HIBA: ez az eszköz csak megrendelői módban érhető el.";
      return recordRequest(input, conversation, page);
    case "marketing_plan":
      if (conversation.mode !== "owner") return "HIBA: ez az eszköz csak megrendelői módban érhető el.";
      return marketingText(String(input.item ?? "").trim());
    default:
      return `HIBA: ismeretlen eszköz: ${name}`;
  }
}

// ─── The loop ─────────────────────────────────────────────────────

async function system(mode: Conversation["mode"]) {
  const map = await knowledge.siteMap();
  return [{ type: "text" as const, text: mode === "owner" ? ownerSystem(map) : customerSystem(map), cache_control: { type: "ephemeral" as const } }];
}

function history(conversation: Conversation): BetaMessageParam[] {
  const earlier = conversation.messages.slice(0, -1).slice(-HISTORY);
  while (earlier.length && earlier[0].role !== "user") earlier.shift();
  return earlier.map((m) => ({
    role: m.role,
    content: m.content + (m.attachments.length ? `\n[Csatolva: ${m.attachments.map((a) => a.fileName).join(", ")}]` : ""),
  }));
}

/** Huba's answer to the conversation's last (user) message; may add orders or requests to it. */
export async function answer(conversation: Conversation, files: Upload[], page: PageInfo, note?: string): Promise<string> {
  const current = conversation.messages[conversation.messages.length - 1];
  const today = new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest", year: "numeric", month: "long", day: "numeric", weekday: "long" });
  let intro = `[Oldal: ${page.path || "?"}${page.title ? ` — „${page.title}”` : ""}] [Ma: ${today}]\n`;
  if (note) intro += `[${note}]\n`;

  const content: BetaContentBlockParam[] = [];
  for (const f of files) {
    if (IMAGE_TYPES.has(f.contentType) && f.size <= MAX_IMAGE_BYTES) {
      content.push({ type: "image", source: { type: "base64", media_type: f.contentType as "image/png", data: f.data.toString("base64") } });
    } else if (f.contentType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data.toString("base64") }, title: f.fileName });
    } else {
      intro += `[Csatolmány, amit nem látsz: ${f.fileName}, ${f.contentType}, ${Math.round(f.size / 1024)} KB]\n`;
    }
  }
  if (files.length) intro += `[Csatolva ehhez az üzenethez: ${files.map((f) => f.fileName).join(", ")}]\n`;
  content.push({ type: "text", text: intro + current.content });

  const messages: BetaMessageParam[] = [...history(conversation), { role: "user", content }];
  const tools = conversation.mode === "owner" ? [SEARCH, READ, REQUEST, MARKETING] : [SEARCH, READ, ORDER];
  const sys = await system(conversation.mode);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: sys,
      tools,
      messages,
      output_config: { effort: EFFORT },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    if (response.stop_reason === "refusal") {
      return "Ebben sajnos nem tudok segíteni. Ha az ajtójával kapcsolatban kérdezne, szívesen válaszolok — vagy hívja a műhelyt.";
    }
    const calls = response.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || !calls.length) {
      return text || "Elgondolkodtam, és elfelejtettem válaszolni… Kérdezze meg újra, kérem!";
    }
    messages.push({ role: "assistant", content: response.content as BetaContentBlockParam[] });
    const results: BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      try {
        const out = await execute(call.name, (call.input ?? {}) as Record<string, unknown>, conversation, page);
        results.push({ type: "tool_result", tool_use_id: call.id, content: out.length > 20000 ? out.slice(0, 20000) : out, is_error: out.startsWith("HIBA") });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: `HIBA: ${(e as Error).message}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return "Ezt most túl sokáig forgattam — kérdezze meg kicsit másképp, és nekifutok újra.";
}

/** Title, summary and category for Alfred. */
export async function summarise(conversation: Conversation): Promise<{ title: string; summary: string; category: string }> {
  const lines: string[] = [];
  for (const m of conversation.messages) {
    lines.push(`${m.role === "user" ? "FELHASZNÁLÓ" : "HUBA"}${m.pagePath ? ` [${m.pagePath}]` : ""}: ${m.content}`);
    for (const a of m.attachments) lines.push(`  (csatolmány: ${a.fileName})`);
  }
  const facts = [
    `Mód: ${conversation.mode === "owner" ? "megrendelői (tulajdonos)" : "látogató"}`,
    `Rögzített kérések: ${conversation.requests.map((r) => `${r.kind}: ${r.title}`).join("; ") || "nincs"}`,
    `Elküldött megrendelések: ${conversation.orders.map((o) => `${o.fields.location} (${o.emailStatus})`).join("; ") || "nincs"}`,
  ].join("\n");
  let transcript = lines.join("\n");
  if (transcript.length > 30000) transcript = transcript.slice(-30000);
  const response = await api().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SUMMARY,
    messages: [{ role: "user", content: `${facts}\n\nÁtirat:\n${transcript}` }],
    output_config: { effort: "low" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  });
  const raw = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return {
    title: String(json.title ?? "Huba-beszélgetés").slice(0, 120),
    summary: String(json.summary ?? ""),
    category: String(json.category ?? "CHAT"),
  };
}
