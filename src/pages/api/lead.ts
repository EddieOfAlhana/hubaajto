/**
 * POST /api/lead — receives configurator + form lead submissions.
 *
 * This endpoint stays server-rendered (prerender = false) even with the
 * rest of the site built as static. The Astro Node adapter serves it
 * at runtime.
 *
 * Validation: name, phone, consent are required; honeypot (`_honey`)
 * must be empty. Accepts either multipart/form-data (from <form fetch>)
 * or application/json (from programmatic clients).
 *
 * For now we just log the lead — wire up Resend / Postmark / a CRM in
 * the TODO block below before pointing live traffic at this.
 */

import type { APIRoute } from "astro";

export const prerender = false;

const DESTINATION = import.meta.env.LEAD_DESTINATION_EMAIL || "info@szerx.hu";

type LeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  postcode?: string;
  message?: string;
  source?: string;
  consent?: string | boolean;
  marketing?: string | boolean;
  configuration?: string;
  _honey?: string;
};

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes" || s === "igen";
}

async function readPayload(request: Request): Promise<LeadPayload> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await request.json()) as LeadPayload;
  }
  // multipart/form-data or x-www-form-urlencoded
  const fd = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out as LeadPayload;
}

export const POST: APIRoute = async ({ request }) => {
  let payload: LeadPayload;
  try {
    payload = await readPayload(request);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Érvénytelen kérés." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // Honeypot — silently accept but discard
  if (payload._honey && payload._honey.trim().length > 0) {
    console.warn("[lead] honeypot tripped — discarding submission");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const name = (payload.name || "").trim();
  const phone = (payload.phone || "").trim();
  const consent = parseBool(payload.consent);

  if (!name) {
    return new Response(JSON.stringify({ ok: false, error: "A név megadása kötelező." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (!phone) {
    return new Response(JSON.stringify({ ok: false, error: "A telefonszám megadása kötelező." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (!consent) {
    return new Response(JSON.stringify({ ok: false, error: "Kérjük, fogadja el az adatvédelmi tájékoztatót." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const lead = {
    receivedAt: new Date().toISOString(),
    name,
    phone,
    email: (payload.email || "").trim() || undefined,
    postcode: (payload.postcode || "").trim() || undefined,
    message: (payload.message || "").trim() || undefined,
    source: (payload.source || "kapcsolat").trim(),
    consent: true,
    marketing: parseBool(payload.marketing),
    configuration: payload.configuration || undefined,
    destination: DESTINATION,
  };

  // TODO(lead-delivery): replace this console.log with a real channel.
  //   Recommended: Resend (RESEND_API_KEY) for transactional email +
  //   append to a Google Sheet or HubSpot list for the CRM. Until then
  //   logs are tail-able via `railway logs` on the deployed service.
  console.log("[lead]", JSON.stringify(lead));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};

// Optional GET — surface a tiny health check (useful for Railway HC).
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true, endpoint: "lead", method: "POST only" }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
