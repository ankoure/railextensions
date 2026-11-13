import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { isRegionCode } from './lib/regions';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    projectName: z.string(),
    agency: z.string(),
    agencyAbbr: z.string().optional(),
    // US state, Canadian province, or Mexican state code — see src/lib/regions.ts
    state: z.string().refine(isRegionCode, { message: 'Unknown region code (see src/lib/regions.ts)' }),
    location: z.string().optional(),
    alignmentSummary: z.string(),
    status: z.enum([
      'proposed', 'planning', 'environmental-review', 'funded',
      'under-construction', 'on-hold', 'completed', 'cancelled',
    ]).optional(),
    mode: z.enum([
      'light-rail', 'heavy-rail', 'commuter-rail', 'streetcar',
      'intercity', 'high-speed', 'monorail', 'brt',
    ]).optional(),
    lengthMiles: z.number().optional(),
    estimatedCost: z.string().optional(),
    proposedOpening: z.string().optional(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
    hasGeometry: z.boolean().optional(),
    lastUpdated: z.coerce.date().optional(),
    references: z.array(z.object({
      title: z.string(),
      url: z.string().url(),
      publication: z.string().optional(),
      date: z.coerce.date().optional(),
    })).default([]),
  }),
});

export const collections = { projects };
