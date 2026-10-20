/** GET /api/huba/inbox/attachments/{conversation}/{attachment} — a file for Alfred's vault note. */
import type { APIRoute } from "astro";
import { inboxAuthorised } from "../../../../../../lib/huba/service";
import { load, readAttachment } from "../../../../../../lib/huba/store";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  if (!inboxAuthorised(request.headers.get("x-inbox-token"))) return new Response(null, { status: 401 });
  const conversation = await load(params.cid ?? "");
  const meta = conversation?.messages.flatMap((m) => m.attachments).find((a) => a.id === params.aid);
  const data = meta ? await readAttachment(conversation!.id, meta.id) : null;
  if (!meta || !data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "content-type": meta.contentType, "cache-control": "no-store" } });
};
