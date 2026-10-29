import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { getAirport } from '@/lib/airports';
import { rateLimit } from '@/lib/rate-limit';

const query = z.object({
  number: z.string().regex(/^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface AviationFlight {
  flight_date: string;
  departure: { iata: string | null; scheduled: string | null };
  arrival: { iata: string | null; scheduled: string | null };
}

export async function GET(req: Request) {
  if (!(await rateLimit(req, 'flight', 15, 60)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const url = new URL(req.url);
  const parsed = query.safeParse({
    number: url.searchParams.get('number'),
    date: url.searchParams.get('date'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  if (!env.AVIATIONSTACK_API_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const number = parsed.data.number.replace(/\s/g, '').toUpperCase();
  try {
    const r = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(env.AVIATIONSTACK_API_KEY)}&flight_iata=${encodeURIComponent(number)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return NextResponse.json({ error: 'upstream' }, { status: 502 });
    const body = (await r.json()) as { data?: AviationFlight[] };
    // L'API renvoie l'heure locale de l'aéroport avec un suffixe de fuseau trompeur : on ne garde que date et heure.
    const hit = body.data?.find(
      (f) =>
        f.flight_date === parsed.data.date &&
        f.departure.iata &&
        f.arrival.iata &&
        f.departure.scheduled &&
        f.arrival.scheduled,
    );
    if (!hit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const from = getAirport(hit.departure.iata!);
    const to = getAirport(hit.arrival.iata!);
    if (!from || !to) return NextResponse.json({ error: 'unknown_airport' }, { status: 404 });
    return NextResponse.json({
      from: from.code,
      to: to.code,
      depDate: hit.departure.scheduled!.slice(0, 10),
      depTime: hit.departure.scheduled!.slice(11, 16),
      arrDate: hit.arrival.scheduled!.slice(0, 10),
      arrTime: hit.arrival.scheduled!.slice(11, 16),
    });
  } catch {
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
