import { describe, expect, it } from 'vitest';
import {
  addDays,
  flightFacts,
  localToUtc,
  pickFlight,
  tzOffsetMin,
  type ProviderFlight,
} from '@/lib/flight-lookup';

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

  it('calcule la durée réelle et le décalage horaire entre deux fuseaux', () => {
    // Paris → Tokyo en octobre (Paris en UTC+2) : 19:30 → 15:25 le lendemain (Tokyo en UTC+9).
    const f = flightFacts(
      { depDate: '2026-10-12', depTime: '19:30', arrDate: '2026-10-13', arrTime: '15:25' },
      'Europe/Paris',
      'Asia/Tokyo',
    );
    expect(f.shiftHours).toBe(7);
    expect(f.durationMin).toBe(12 * 60 + 55);
    // New York → Paris avant le changement d'heure de fin octobre : 6 h vers l'est.
    const w = flightFacts(
      { depDate: '2026-10-20', depTime: '17:30', arrDate: '2026-10-21', arrTime: '05:45' },
      'America/New_York',
      'Europe/Paris',
    );
    expect(w.shiftHours).toBe(6);
    expect(w.durationMin).toBe(6 * 60 + 15);
    expect(tzOffsetMin('Asia/Tokyo', Date.UTC(2026, 0, 1))).toBe(540);
    expect(localToUtc('2026-07-01', '12:00', 'Europe/Paris')).toBe(Date.UTC(2026, 6, 1, 10, 0));
  });
});
