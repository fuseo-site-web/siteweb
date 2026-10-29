import { z } from 'zod';
import { getAirport } from '@/lib/airports';

/** Pays proposés (codes ISO 3166-1 alpha-2) ; les libellés viennent d'Intl.DisplayNames. */
export const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GF GH GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NZ OM PA PE PF PG PH PK PL PM PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VG VN VU WS YE YT ZA ZM ZW'.split(
    ' ',
  );

const MIN_AGE = 12;
const MAX_AGE = 110;

/** Âge en années révolues à la date `now` ; null si la date est invalide. */
export function ageFromBirthDate(birth: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return null;
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() < d))
    age -= 1;
  return age;
}

const opt = (s: z.ZodString) => s.or(z.literal('')).transform((v) => v || null);

export const profileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || null),
    lastName: z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || null),
    birthDate: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    country: opt(z.string().regex(/^[A-Z]{2}$/)),
    homeAirport: opt(z.string().regex(/^[A-Z]{3}$/)),
  })
  .strict()
  .refine((v) => v.country === null || COUNTRY_CODES.includes(v.country), { path: ['country'] })
  .refine((v) => v.homeAirport === null || !!getAirport(v.homeAirport), { path: ['homeAirport'] })
  .refine(
    (v) => {
      if (v.birthDate === null) return true;
      const age = ageFromBirthDate(v.birthDate);
      return age !== null && age >= MIN_AGE && age <= MAX_AGE;
    },
    { path: ['birthDate'] },
  );

export type ProfileValues = z.output<typeof profileSchema>;
