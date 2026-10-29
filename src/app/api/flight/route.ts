import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { getAirport } from '@/lib/airports';
import { pickFlight, type ProviderFlight } from '@/lib/flight-lookup';
import { rateLimit } from '@/lib/rate-limit';

const query = z.object({
  number: z.string().regex(/^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

interface ProviderBody {
  data?: ProviderFlight[];
  error?: { code?: string };
}

/** Remplit un vol à partir de son numéro (date facultative). Les réponses du fournisseur sont gardées 1 h pour économiser le quota. */
export async function GET(req: Request) {
  if (!(await rateLimit(req, 'flight', 20, 60)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const url = new URL(req.url);
  const parsed = query.safeParse({
    number: url.searchParams.get('number'),
    date: url.searchParams.get('date') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  if (!env.AVIATIONSTACK_API_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const number = parsed.data.number.replace(/\s/g, '').toUpperCase();
  try {
    const r = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(env.AVIATIONSTACK_API_KEY)}&flight_iata=${encodeURIComponent(number)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return NextResponse.json({ error: 'upstream' }, { status: 502 });
    const body = (await r.json()) as ProviderBody;
    // Quota ou limite de débit atteints chez le fournisseur : ce n'est pas « vol introuvable ».
    if (body.error) return NextResponse.json({ error: 'quota' }, { status: 503 });

    const today = new Date().toISOString().slice(0, 10);
    const hit = pickFlight(body.data ?? [], parsed.data.date, today);
    if (!hit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    // Les deux aéroports doivent exister dans notre liste (fuseau horaire, nom de la ville).
    if (!getAirport(hit.from) || !getAirport(hit.to))
      return NextResponse.json({ error: 'unknown_airport' }, { status: 404 });
    return NextResponse.json(hit);
  } catch {
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
