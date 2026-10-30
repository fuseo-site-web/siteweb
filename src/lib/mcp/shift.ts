import { tzOffsetMin } from '@/lib/flight-lookup';

/** Décalage horaire entre deux fuseaux à une date donnée : positif vers l'est (l'horloge avance). */
export function timeZoneShift(
  fromTz: string,
  toTz: string,
  date: string,
): { hours: number; direction: 'east' | 'west' | 'none' } {
  const noon = Date.parse(`${date}T12:00:00Z`);
  const hours = (tzOffsetMin(toTz, noon) - tzOffsetMin(fromTz, noon)) / 60;
  return { hours, direction: Math.abs(hours) < 0.01 ? 'none' : hours > 0 ? 'east' : 'west' };
}
