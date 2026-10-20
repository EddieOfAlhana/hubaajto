/** POST /api/huba/conversations — a new conversation; the token in the answer authorises the rest. */
import type { APIRoute } from "astro";
import { clientIp, fail, json } from "../../../lib/huba/http";
import { checkStartLimit, publicView, startIdleTimer } from "../../../lib/huba/service";
import { create } from "../../../lib/huba/store";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    startIdleTimer();
    checkStartLimit(clientIp(request, clientAddress));
    const { conversation, token } = await create();
    return json({ ok: true, token, conversation: publicView(conversation) });
  } catch (e) {
    return fail(e);
  }
};
