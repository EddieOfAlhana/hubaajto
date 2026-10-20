/** POST /api/huba/conversations/{id}/messages — multipart: text, pagePath, pageTitle, files[]. */
import type { APIRoute } from "astro";
import { clientIp, fail, json } from "../../../../../lib/huba/http";
import { HubaError, MAX_FILE_BYTES, MAX_FILES, post } from "../../../../../lib/huba/service";
import { authorised } from "../../../../../lib/huba/store";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  try {
    const id = params.id ?? "";
    if (!(await authorised(id, request.headers.get("x-huba-token")))) return json({ ok: false, error: "Nincs ilyen beszélgetés." }, 404);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_FILES * MAX_FILE_BYTES + 100_000) throw new HubaError("Túl nagy feltöltés.", 413);
    const form = await request.formData();
    const files = [];
    for (const entry of form.getAll("files")) {
      if (typeof entry === "string") continue;
      files.push({ name: entry.name, type: entry.type || "application/octet-stream", data: Buffer.from(await entry.arrayBuffer()) });
    }
    const result = await post(id, {
      text: String(form.get("text") ?? ""),
      pagePath: String(form.get("pagePath") ?? "") || undefined,
      pageTitle: String(form.get("pageTitle") ?? "") || undefined,
      files,
      ip: clientIp(request, clientAddress),
    });
    return json({ ok: true, ...result });
  } catch (e) {
    return fail(e);
  }
};
