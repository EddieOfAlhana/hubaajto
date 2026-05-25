import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default("Huba ajtó szerkesztőség"),
    pillar: z.enum([
      "muemleki",       // Pillar 0 — Stílus / Műemléki
      "premium-csaladi", // Pillar -1 — Prémium családi ház
      "tudnivalok",      // Pillar 1 — Mit kell tudni
      "arak",            // Pillar 2 — Mennyibe kerül
      "beepites",        // Pillar 3 — Beépítés és folyamat
      "helyi",           // Pillar 4 — Helyi
    ]),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    cornerstone: z.boolean().default(false),
    readingMinutes: z.number().optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).default([]),
    }).optional(),
  }),
});

export const collections = { blog };
