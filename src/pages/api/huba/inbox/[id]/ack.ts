/** POST /api/huba/inbox/{id}/ack — Alfred filed and sent it; it leaves the inbox. */
import type { APIRoute } from "astro";
import { fail, json } from "../../../../../lib/huba/http";
import { ack, inboxAuthorised } from "../../../../../lib/huba/service";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  if (!inboxAuthorised(request.headers.get("x-inbox-token"))) return json({ ok: false }, 401);
  try {
    await ack(params.id ?? "");
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
};
