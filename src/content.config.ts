import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Schema volontairement figé dès le départ : il conditionne la possibilité
// d'alimenter la collection depuis une autre source (vault Obsidian) sans refonte.
const ecrits = defineCollection({
  loader: glob({ base: './src/content/ecrits', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { ecrits };
