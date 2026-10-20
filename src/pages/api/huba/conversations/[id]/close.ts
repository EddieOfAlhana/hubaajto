/** POST /api/huba/conversations/{id}/close — the visitor's "Kész" button. */
import type { APIRoute } from "astro";
import { fail, json } from "../../../../../lib/huba/http";
import { close } from "../../../../../lib/huba/service";
import { authorised } from "../../../../../lib/huba/store";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id ?? "";
    if (!(await authorised(id, request.headers.get("x-huba-token")))) return json({ ok: false, error: "Nincs ilyen beszélgetés." }, 404);
    await close(id, "USER");
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
};
