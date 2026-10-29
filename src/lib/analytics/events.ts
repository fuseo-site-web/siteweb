import { z } from 'zod';

const short = (n: number) => z.string().trim().max(n);

export const eventSchema = z.object({
  name: z.enum(['page_view', 'click']),
  path: z.string().max(300).regex(/^\//),
  /** Première page de la visite : on enregistre alors l'origine. */
  entry: z.boolean().optional(),
  ref: z.string().max(500).optional(),
  utm: z
    .object({
      source: short(100).optional(),
      medium: short(100).optional(),
      campaign: short(100).optional(),
    })
    .optional(),
  label: short(120).optional(),
  target: short(300).optional(),
});

export const batchSchema = z.object({
  vid: z.uuid(),
  sid: z.uuid(),
  events: z.array(eventSchema).min(1).max(20),
});

export type TrackedEvent = z.infer<typeof eventSchema>;
export type EventBatch = z.infer<typeof batchSchema>;
