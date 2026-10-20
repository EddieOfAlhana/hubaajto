import type { APIRoute } from "astro";
import { enabled } from "../../../lib/huba/agent";
import { json } from "../../../lib/huba/http";

export const prerender = false;

export const GET: APIRoute = async () => json({ ok: true, enabled: enabled() });
