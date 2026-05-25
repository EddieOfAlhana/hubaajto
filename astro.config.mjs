// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://hubaajto.hu",
  trailingSlash: "never",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/_") && !page.includes("/admin"),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  build: { format: "directory" },
  prefetch: { defaultStrategy: "viewport" },
});
