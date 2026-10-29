import { describe, expect, it } from 'vitest';
import { addDays, pickFlight, type ProviderFlight } from '@/lib/flight-lookup';

// Le fournisseur donne l'heure locale avec un faux suffixe +00:00.
const f = (date: string, dep: string, arr: string, from = 'JFK', to = 'CDG'): ProviderFlight => ({
  flight_date: date,
  departure: { iata: from, scheduled: `${date}T${dep}:00+00:00` },
  arrival: { iata: to, scheduled: `${addDays(date, 1)}T${arr}:00+00:00` },
});

const TODAY = '2026-10-29';
const flights = [f('2026-10-28', '17:30', '05:45'), f('2026-10-29', '17:30', '05:45')];

describe('recherche de vol par numéro', () => {
  it('prend le vol exact quand la date est connue du fournisseur', () => {
    expect(pickFlight(flights, '2026-10-29', TODAY)).toEqual({
      from: 'JFK',
      to: 'CDG',
      depDate: '2026-10-29',
      depTime: '17:30',
      arrDate: '2026-10-30',
      arrTime: '05:45',
      approx: false,
    });
  });

  it('sans date : propose le prochain vol et remplit aussi la date', () => {
    const hit = pickFlight(flights, undefined, TODAY)!;
    expect(hit.depDate).toBe('2026-10-29');
    expect(hit.approx).toBe(false);
  });

  it('pour une date lointaine : reprend les horaires habituels, décale les dates et le signale', () => {
    const hit = pickFlight(flights, '2026-12-15', TODAY)!;
    expect(hit).toMatchObject({
      depDate: '2026-12-15',
      depTime: '17:30',
      arrDate: '2026-12-16',
      arrTime: '05:45',
      approx: true,
    });
  });

  it("garde l'écart de jours d'un vol de nuit qui arrive le surlendemain", () => {
    const long: ProviderFlight = {
      flight_date: '2026-10-29',
      departure: { iata: 'CDG', scheduled: '2026-10-29T23:30:00+00:00' },
      arrival: { iata: 'HND', scheduled: '2026-10-31T19:05:00+00:00' },
    };
    expect(pickFlight([long], '2026-11-10', TODAY)).toMatchObject({
      arrDate: '2026-11-12',
      approx: true,
    });
  });

  it('ignore les vols sans aéroport ou sans horaire, et renvoie null sans résultat', () => {
    const broken: ProviderFlight = {
      flight_date: TODAY,
      departure: { iata: null, scheduled: null },
      arrival: { iata: 'CDG', scheduled: null },
    };
    expect(pickFlight([broken], TODAY, TODAY)).toBeNull();
    expect(pickFlight([], TODAY, TODAY)).toBeNull();
  });

  it('additionne les jours sans décalage lié aux changements d’heure', () => {
    expect(addDays('2026-10-24', 3)).toBe('2026-10-27');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
