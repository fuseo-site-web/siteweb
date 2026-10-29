import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const local = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);
const iata = z.string().regex(/^[A-Z]{3}$/);

export const legSchema = z
  .object({
    from: iata,
    to: iata,
    departure: local,
    arrival: local,
    flightNumber: z.string().max(10).optional(),
  })
  .strict();

export const planInputSchema = z
  .object({
    profile: z
      .object({
        bed: hhmm,
        wake: hhmm,
        chronotype: z.enum(['morning', 'intermediate', 'evening']),
        age: z.number().int().min(12).max(100).nullable().optional(),
        caffeineUse: z.enum(['none', 'low', 'moderate', 'high']),
        napHabit: z.enum(['never', 'sometimes', 'often']),
        sleepQuality: z.enum(['good', 'fair', 'poor']),
      })
      .strict(),
    outbound: z.array(legSchema).min(1).max(4),
    return: z.array(legSchema).max(4).default([]),
    preDays: z.number().int().min(0).max(3),
    strategy: z.enum(['AUTO', 'FULL_ADAPTATION', 'PARTIAL_ADAPTATION', 'HOME_TIME_MAINTENANCE']),
    lamp: z.boolean(),
    coffee: z.boolean(),
  })
  .strict()
  .refine((v) => v.outbound.length + v.return.length <= 8, { message: 'too_many_legs' });

export type PlanInput = z.infer<typeof planInputSchema>;
export type LegInput = z.infer<typeof legSchema>;
