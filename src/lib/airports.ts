import data from '@/data/airports.json';

export interface Airport {
  code: string;
  name: string;
  city: string;
  cityEn: string;
  cityEs: string;
  tz: string;
}

export const AIRPORTS = data as Airport[];
const byCode = new Map(AIRPORTS.map((a) => [a.code, a]));

export const getAirport = (code: string): Airport | undefined => byCode.get(code.toUpperCase());

export const cityName = (a: Airport, locale: string) =>
  locale === 'en' ? a.cityEn : locale === 'es' ? a.cityEs : a.city;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const POPULAR = ['CDG', 'ORY', 'JFK', 'LHR', 'HND', 'DXB', 'TLV', 'YUL', 'RUN', 'BKK'];

/** Recherche tolérante (code, ville, nom ; accents ignorés). */
export function searchAirports(query: string, locale: string, limit = 8): Airport[] {
  const q = norm(query.trim());
  if (!q) return POPULAR.map((c) => byCode.get(c)!).filter(Boolean);
  const scored: Array<[number, Airport]> = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const names = [norm(a.city), norm(a.cityEn), norm(a.cityEs), norm(a.name)];
    const score =
      code === q
        ? 0
        : code.startsWith(q)
          ? 1
          : names.some((n) => n.startsWith(q))
            ? 2
            : names.some((n) => n.includes(q))
              ? 4
              : 9;
    if (score < 9) scored.push([score, a]);
  }
  void locale;
  return scored
    .sort((x, y) => x[0] - y[0])
    .slice(0, limit)
    .map(([, a]) => a);
}
