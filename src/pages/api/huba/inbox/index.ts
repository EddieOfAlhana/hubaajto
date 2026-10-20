/**
 * GET /api/huba/inbox (header X-Inbox-Token = HUBA_INBOX_TOKEN) — closed, summarised, not yet
 * delivered conversations for Alfred (alfred/scheduler/hubaajto_poll.py). Closes idle ones first.
 */
import type { APIRoute } from "astro";
import { fail, json } from "../../../../lib/huba/http";
import { inbox, inboxAuthorised } from "../../../../lib/huba/service";

export const prerender = false;

export const GET: APIRoute = async ({ request, site }) => {
  if (!inboxAuthorised(request.headers.get("x-inbox-token"))) return json({ ok: false }, 401);
  try {
    return json(await inbox(site?.toString() ?? "https://www.hubaajto.hu"));
  } catch (e) {
    return fail(e);
  }
};
