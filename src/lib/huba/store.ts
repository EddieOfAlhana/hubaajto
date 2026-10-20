/**
 * Huba's conversations on disk: one JSON file per conversation, attachments beside it.
 *
 *   $HUBA_DATA_DIR/conversations/<id>.json
 *   $HUBA_DATA_DIR/attachments/<id>/<attachment id>
 *
 * There is no database on this site, and Huba's volume is small (a few dozen conversations a
 * week), so plain files are enough. On Railway, HUBA_DATA_DIR must sit on a volume, otherwise a
 * redeploy loses whatever Alfred has not collected yet.
 *
 * All writes to one conversation go through `withConversation`, which serialises them in this
 * process (the site runs as a single Node instance).
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Mode = "customer" | "owner";

export type AttachmentMeta = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  pagePath?: string;
  pageTitle?: string;
  attachments: AttachmentMeta[];
};

export type OwnerRequest = {
  kind: string;
  title: string;
  description: string;
  pagePath?: string;
  attachments: string[];
  createdAt: string;
};

export type Order = {
  createdAt: string;
  fields: Record<string, string>;
  attachments: string[];
  /** "sent", "not-configured" (no SMTP yet) or "failed: <reason>" */
  emailStatus: string;
};

export type Conversation = {
  id: string;
  tokenHash: string;
  mode: Mode;
  status: "open" | "closed";
  startedAt: string;
  lastActivityAt: string;
  closedAt?: string;
  closeReason?: string;
  messages: StoredMessage[];
  requests: OwnerRequest[];
  orders: Order[];
  title?: string;
  summary?: string;
  category?: string;
  /** Full report and a vault note for Zoltán (owner requests, failed orders); otherwise a short Telegram note. */
  forDeveloper?: boolean;
  deliveredAt?: string;
};

const DATA_DIR = path.resolve(process.env.HUBA_DATA_DIR || "data/huba");
const CONV_DIR = path.join(DATA_DIR, "conversations");
const ATT_DIR = path.join(DATA_DIR, "attachments");
const ID = /^[0-9a-f-]{36}$/;

const locks = new Map<string, Promise<unknown>>();

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function file(id: string): string {
  if (!ID.test(id)) throw new Error("bad id");
  return path.join(CONV_DIR, `${id}.json`);
}

async function writeAtomic(target: string, data: string | Buffer) {
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, target);
}

export async function create(mode: Mode = "customer"): Promise<{ conversation: Conversation; token: string }> {
  const token = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: randomUUID(),
    tokenHash: hash(token),
    mode,
    status: "open",
    startedAt: now,
    lastActivityAt: now,
    messages: [],
    requests: [],
    orders: [],
  };
  await save(conversation);
  return { conversation, token };
}

export async function load(id: string): Promise<Conversation | null> {
  try {
    return JSON.parse(await readFile(file(id), "utf8")) as Conversation;
  } catch {
    return null;
  }
}

export async function save(conversation: Conversation) {
  await writeAtomic(file(conversation.id), JSON.stringify(conversation, null, 1));
}

/** The conversation, if the visitor holds its token. */
export async function authorised(id: string, token: string | null): Promise<Conversation | null> {
  if (!token || !ID.test(id)) return null;
  const conversation = await load(id);
  if (!conversation) return null;
  const a = Buffer.from(conversation.tokenHash, "hex");
  const b = Buffer.from(hash(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? conversation : null;
}

/** Runs `fn` on the freshest copy of the conversation and saves what it returns, one at a time per id. */
export async function withConversation<T>(id: string, fn: (c: Conversation) => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    const conversation = await load(id);
    if (!conversation) throw new Error("not found");
    const result = await fn(conversation);
    await save(conversation);
    return result;
  });
  locks.set(id, run);
  try {
    return await run;
  } finally {
    if (locks.get(id) === run) locks.delete(id);
  }
}

export async function all(): Promise<Conversation[]> {
  let names: string[] = [];
  try {
    names = await readdir(CONV_DIR);
  } catch {
    return [];
  }
  const out: Conversation[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const c = await load(name.slice(0, -5));
    if (c) out.push(c);
  }
  return out.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export async function putAttachment(conversationId: string, fileName: string, contentType: string, data: Buffer): Promise<AttachmentMeta> {
  const id = randomUUID();
  await writeAtomic(path.join(ATT_DIR, conversationId, id), data);
  return { id, fileName, contentType, size: data.length };
}

export async function readAttachment(conversationId: string, attachmentId: string): Promise<Buffer | null> {
  if (!ID.test(conversationId) || !ID.test(attachmentId)) return null;
  try {
    return await readFile(path.join(ATT_DIR, conversationId, attachmentId));
  } catch {
    return null;
  }
}

export function attachmentsOf(conversation: Conversation): AttachmentMeta[] {
  return conversation.messages.flatMap((m) => m.attachments);
}
