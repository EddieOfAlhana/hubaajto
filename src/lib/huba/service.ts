/**
 * Huba's conversation flow: start, message (with the owner-mode switch), close, idle close,
 * and Alfred's inbox.
 *
 * Owner mode: when a message contains HUBA_OWNER_PASSWORD as a word (case-insensitive), the
 * conversation switches to owner mode for good. The server does this, not the model: the
 * password never reaches the model or the stored transcript (it is replaced by "[jelszó]"), and a
 * visitor cannot talk Huba into owner mode.
 */

import * as agent from "./agent";
import { all, putAttachment, remove, withConversation, type AttachmentMeta, type Conversation, type StoredMessage } from "./store";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([...agent.IMAGE_TYPES, "application/pdf"]);
const IDLE_MINUTES = Number(process.env.HUBA_IDLE_MINUTES || 30);
const MAX_USER_MESSAGES = 60;

export class HubaError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

// ─── Abuse limits (in memory; one Node process) ───────────────────

const hits = new Map<string, number[]>();

/** At most `max` events per key in `windowMs`. */
function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 86_400_000)) hits.delete(k);
  return true;
}

export function checkStartLimit(ip: string) {
  if (!allow(`start:${ip}`, 20, 86_400_000)) throw new HubaError("Ma már sok beszélgetést indított — kérjük, hívjon minket telefonon.", 429);
}

function checkMessageLimit(ip: string) {
  if (!allow(`msg10:${ip}`, 30, 600_000) || !allow(`msgday:${ip}`, 200, 86_400_000)) {
    throw new HubaError("Egy kicsit sok üzenet jött egyszerre — kérem, várjon pár percet.", 429);
  }
}

// ─── Owner password ───────────────────────────────────────────────

function passwordPattern(): RegExp | null {
  const pw = (process.env.HUBA_OWNER_PASSWORD || "").trim();
  if (!pw) return null;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${pw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "giu");
}

const OWNER_GREETING =
  "Üdvözlöm! Átváltottam **megrendelői módba** — innentől a weboldal módosítási kéréseit veszem fel, és továbbítom Zoltánnak.\n\n" +
  "Írja meg, mit szeretne (pl. *„ezen az oldalon a harmadik képet cseréld erre”*), és csatolja a képet a 📎 gombbal. " +
  "Szívesen végigbeszélem azt is, **hogyan lehet több megrendelés** — mi készült el, mi vár Önre, és miben segítek lépésről lépésre. " +
  "Ha végzett, a **Kész** gombbal zárhatja a beszélgetést.";

// ─── Flow ─────────────────────────────────────────────────────────

export type Incoming = {
  text: string;
  pagePath?: string;
  pageTitle?: string;
  files: { name: string; type: string; data: Buffer }[];
  ip: string;
};

export function publicView(c: Conversation) {
  return {
    id: c.id,
    mode: c.mode,
    status: c.status,
    messages: c.messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt, attachments: m.attachments.map((a) => a.fileName) })),
  };
}

function safeName(name: string): string {
  const plain = (name || "fajl").replace(/[\\/\r\n"]/g, "_").trim() || "fajl";
  return plain.length > 120 ? plain.slice(-120) : plain;
}

export async function post(id: string, input: Incoming) {
  checkMessageLimit(input.ip);
  if (input.files.length > MAX_FILES) throw new HubaError(`Egyszerre legfeljebb ${MAX_FILES} fájl küldhető.`);
  for (const f of input.files) {
    if (f.data.length > MAX_FILE_BYTES) throw new HubaError(`${f.name}: legfeljebb 10 MB lehet egy fájl.`);
    if (!ALLOWED_TYPES.has(f.type)) throw new HubaError(`${f.name}: csak kép (JPG, PNG, WEBP, GIF) vagy PDF küldhető.`);
  }
  let text = input.text.trim().slice(0, 4000);
  if (!text && !input.files.length) throw new HubaError("Üres üzenet.");

  return withConversation(id, async (c) => {
    if (c.status !== "open") throw new HubaError("Ez a beszélgetés már lezárult — kezdjen újat.", 409);
    if (c.messages.filter((m) => m.role === "user").length >= MAX_USER_MESSAGES) {
      throw new HubaError("Ez a beszélgetés elérte a hosszkorlátot — kérem, kezdjen újat, vagy hívjon minket.", 409);
    }

    let switched = false;
    const pw = passwordPattern();
    if (pw && pw.test(text)) {
      text = text.replace(pw, "$1[jelszó]").trim();
      if (c.mode !== "owner") {
        c.mode = "owner";
        switched = true;
      }
    }

    const now = new Date().toISOString();
    const attachments: AttachmentMeta[] = [];
    for (const f of input.files) attachments.push(await putAttachment(c.id, safeName(f.name), f.type, f.data));
    const userMessage: StoredMessage = {
      role: "user",
      content: text || "(csatolmány)",
      createdAt: now,
      pagePath: input.pagePath?.slice(0, 300),
      pageTitle: input.pageTitle?.slice(0, 300),
      attachments,
    };
    c.messages.push(userMessage);
    c.lastActivityAt = now;

    let reply: string;
    const onlyPassword = switched && /^\[jelszó\][\s.!]*$/.test(text) && !input.files.length;
    if (onlyPassword) {
      reply = OWNER_GREETING;
    } else if (!agent.enabled()) {
      reply = "Huba most nem elérhető. Kérem, hívjon minket, vagy írjon a kapcsolat oldalon.";
    } else {
      try {
        reply = await agent.answer(
          c,
          input.files.map((f, i) => ({ ...attachments[i], data: f.data })),
          { path: userMessage.pagePath, title: userMessage.pageTitle },
          switched ? "A felhasználó most adta meg a megrendelői jelszót: megrendelői módba váltottál. Köszöntsd röviden, és foglalkozz a kérésével." : undefined,
        );
      } catch (e) {
        console.error("[huba] answer failed", e);
        reply = "Hoppá, most elakadtam egy pillanatra. Kérem, próbálja újra egy perc múlva — vagy hívjon minket telefonon.";
      }
    }
    c.messages.push({ role: "assistant", content: reply, createdAt: new Date().toISOString(), pagePath: userMessage.pagePath, attachments: [] });
    c.lastActivityAt = new Date().toISOString();
    return { reply, mode: c.mode };
  });
}

/** Closes and summarises; what Alfred collects. */
export async function close(id: string, reason: string) {
  return withConversation(id, async (c) => {
    if (c.status !== "open") return;
    c.status = "closed";
    c.closedAt = new Date().toISOString();
    c.closeReason = reason;
    const userTurns = c.messages.filter((m) => m.role === "user").length;
    if (!userTurns) {
      c.title = "(üres)";
      c.deliveredAt = c.closedAt; // nothing to tell
      return;
    }
    try {
      if (!agent.enabled()) throw new Error("nincs Anthropic-kulcs");
      Object.assign(c, await agent.summarise(c));
    } catch (e) {
      c.title = c.mode === "owner" ? "Huba: megrendelői kérések" : "Huba-beszélgetés";
      c.summary = `Az összefoglaló nem készült el (${(e as Error).message}); az átirat megvan.`;
      c.category = c.requests.length ? "OWNER_REQUEST" : c.orders.length ? "ORDER" : "CHAT";
    }
    c.forDeveloper = c.mode === "owner" || c.requests.length > 0 || c.orders.some((o) => o.emailStatus !== "sent");
  });
}

/** Conversations are kept this long after their last message; the privacy notice (/adatvedelem) promises it. */
const RETENTION_DAYS = 90;

/** Thirty minutes of silence closes a conversation, as the visitor's "Kész" button would. */
export async function closeIdle() {
  const cutoff = Date.now() - IDLE_MINUTES * 60_000;
  const expiry = Date.now() - RETENTION_DAYS * 86_400_000;
  for (const c of await all()) {
    if (Date.parse(c.lastActivityAt) < expiry) {
      await remove(c.id).catch((e) => console.warn("[huba] purge failed", c.id, e));
      continue;
    }
    if (c.status === "open" && Date.parse(c.lastActivityAt) < cutoff) {
      try {
        await close(c.id, "IDLE");
      } catch (e) {
        console.warn("[huba] idle close failed", c.id, e);
      }
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startIdleTimer() {
  if (timer) return;
  timer = setInterval(() => closeIdle().catch(() => undefined), 5 * 60_000);
  timer.unref?.();
}

// ─── Alfred's inbox ───────────────────────────────────────────────

export function inboxAuthorised(token: string | null): boolean {
  const expected = process.env.HUBA_INBOX_TOKEN;
  return Boolean(expected && token && token.length === expected.length && token === expected);
}

export async function inbox(siteUrl: string) {
  await closeIdle();
  return (await all())
    .filter((c) => c.status === "closed" && !c.deliveredAt)
    .map((c) => {
      const { tokenHash: _hidden, ...rest } = c;
      return { ...rest, siteUrl };
    });
}

export async function ack(id: string) {
  await withConversation(id, async (c) => {
    c.deliveredAt = new Date().toISOString();
  });
}

