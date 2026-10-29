import { NextResponse } from 'next/server';
import { planInputSchema, type PlanInput } from '@/lib/plan-schema';
import { rateLimit, sameOrigin } from '@/lib/rate-limit';

const MAX_BODY = 16_000;

/** Valide une requête de plan (origine, débit, taille, schéma, fenêtre de dates) : partagé par /api/plan et /api/plan/pdf. */
export async function readPlanRequest(
  req: Request,
  bucket: string,
): Promise<{ input: PlanInput } | { error: NextResponse }> {
  const fail = (error: string, status: number) => ({
    error: NextResponse.json({ error }, { status }),
  });
  if (!sameOrigin(req)) return fail('forbidden', 403);
  if (!(await rateLimit(req, bucket, 20, 60))) return fail('rate_limited', 429);

  const text = await req.text();
  if (text.length > MAX_BODY) return fail('too_large', 413);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('invalid_json', 400);
  }
  const parsed = planInputSchema.safeParse(json);
  if (!parsed.success) return fail('invalid_input', 422);

  // Fenêtre de dates plausible : de -1 jour à +18 mois.
  const now = Date.now();
  const times = [...parsed.data.outbound, ...parsed.data.return].map((l) =>
    Date.parse(`${l.departure}:00Z`),
  );
  if (times.some((t) => !(t > now - 2 * 864e5 && t < now + 550 * 864e5)))
    return fail('date_out_of_range', 422);
  return { input: parsed.data };
}
