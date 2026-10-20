/** GET /api/huba/conversations/{id} (header X-Huba-Token) — the transcript, to restore the widget. */
import type { APIRoute } from "astro";
import { fail, json } from "../../../../lib/huba/http";
import { publicView } from "../../../../lib/huba/service";
import { authorised } from "../../../../lib/huba/store";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const c = await authorised(params.id ?? "", request.headers.get("x-huba-token"));
    return c ? json({ ok: true, conversation: publicView(c) }) : json({ ok: false, error: "Nincs ilyen beszélgetés." }, 404);
  } catch (e) {
    return fail(e);
  }
};
