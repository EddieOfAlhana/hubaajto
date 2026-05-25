// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// Hybrid output: most pages are prerendered statically (Astro 6 default
// when `output: "static"`); the `/api/*` route opts in to runtime
// rendering via `export const prerender = false`. Requires the Node
// adapter to serve the dynamic endpoint in production.
export default defineConfig({
  site: "https://hubaajto.hu",
  trailingSlash: "never",
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Astro 6 ships a strict same-origin POST guard. We disable it because:
  //   1) the only server endpoint is /api/lead, which we want callable from
  //      curl / Railway health-checks, and
  //   2) the endpoint already has a honeypot field + required-field validation.
  // If a CSRF-protected admin surface lands later, re-enable this and add
  // explicit allowed origins per-route.
  security: { checkOrigin: false },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/_") && !page.includes("/admin") && !page.includes("/api"),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  build: { format: "directory" },
  prefetch: { defaultStrategy: "viewport" },
});
