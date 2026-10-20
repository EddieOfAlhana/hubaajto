import { HubaError } from "./service";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function fail(e: unknown): Response {
  if (e instanceof HubaError) return json({ ok: false, error: e.message }, e.status);
  if ((e as Error)?.message === "not found") return json({ ok: false, error: "Nincs ilyen beszélgetés." }, 404);
  console.error("[huba]", e);
  return json({ ok: false, error: "Váratlan hiba történt." }, 500);
}

/** The visitor's address behind Railway's proxy. */
export function clientIp(request: Request, fallback: string | undefined): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || fallback || "unknown";
}
