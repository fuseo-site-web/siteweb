import { describe, expect, it } from 'vitest';
import { contrast, parseFlight } from '@/lib/airlines';
import type { PlanInput } from '@/lib/plan-schema';
import { buildTicket, splitTickets } from '@/lib/trip-view';

const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  profile: {
    bed: '23:00',
    wake: '07:00',
    chronotype: 'intermediate',
    age: 40,
    caffeineUse: 'moderate',
    napHabit: 'sometimes',
    sleepQuality: 'good',
  },
  outbound: [
    {
      from: 'CDG',
      to: 'HND',
      departure: '2027-03-10T19:30',
      arrival: '2027-03-11T15:25',
      flightNumber: 'AF276',
    },
  ],
  return: [{ from: 'HND', to: 'CDG', departure: '2027-03-20T10:30', arrival: '2027-03-20T16:35' }],
  preDays: 2,
  strategy: 'AUTO',
  lamp: false,
  coffee: true,
  ...over,
});
const id = '23d15e59-62b6-4a0f-becb-9ccb0d2061e0';

describe('compagnies', () => {
  it('reconnaît Air France et ses couleurs', () => {
    const f = parseFlight('AF276')!;
    expect(f.display).toBe('AF 276');
    expect(f.airline).toMatchObject({
      code: 'AF',
      name: 'Air France',
      bg: '#002157',
      fg: '#ffffff',
    });
  });
  it('texte sombre sur fond clair (Vueling), teinte stable pour une compagnie inconnue', () => {
    expect(parseFlight('VY1234')!.airline.fg).toBe('#0b2240');
    const a = parseFlight('ZZ12')!.airline;
    expect(a.name).toBe('ZZ');
    expect(parseFlight('ZZ99')!.airline.bg).toBe(a.bg);
  });
  it('refuse un numéro invalide', () => {
    expect(parseFlight('')).toBeNull();
    expect(parseFlight('vol 12')).toBeNull();
  });
});

describe('lisibilité des billets', () => {
  it('texte lisible (≥ 4,5:1) sur l’en-tête et le badge de chaque compagnie, connue ou non', () => {
    const codes = [
      'AF',
      'KL',
      'LH',
      'BA',
      'IB',
      'VY',
      'U2',
      'FR',
      'TO',
      'EK',
      'QR',
      'TK',
      'SQ',
      'NH',
      'JL',
      'DL',
      'AA',
      'UA',
      'AC',
      'LX',
      'TP',
      'ZZ',
      'QX',
      '3U',
      'X9',
    ];
    for (const c of codes) {
      const a = parseFlight(`${c}123`)!.airline;
      expect(contrast(a.bg, a.fg), `${c} en-tête`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.accent, a.accentFg), `${c} badge`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('billet de voyage', () => {
  it('à venir : décalage, compte à rebours, fuseaux aller-retour', () => {
    const t = buildTicket(id, base(), 'fr', new Date('2027-03-01T10:00:00Z'));
    expect(t).toMatchObject({
      status: 'upcoming',
      daysUntil: 9,
      shiftHours: 8,
      zonesCrossed: 16,
      ref: 'FU-23D15E',
    });
    expect(t.from).toEqual({ code: 'CDG', city: 'Paris' });
    expect(t.to.city).toBe('Tokyo');
    expect(t.flight).toBe('AF 276');
  });
  it('en cours puis passé selon la date de fin du retour', () => {
    expect(buildTicket(id, base(), 'fr', new Date('2027-03-15T10:00:00Z')).status).toBe('ongoing');
    expect(buildTicket(id, base(), 'fr', new Date('2027-03-21T10:00:00Z')).status).toBe('past');
  });
  it('sépare à venir (le plus proche d’abord) et passés (le plus récent d’abord)', () => {
    const now = new Date('2027-06-01T00:00:00Z');
    const mk = (n: string, d: string, a: string) =>
      buildTicket(
        n,
        base({
          outbound: [{ from: 'CDG', to: 'JFK', departure: `${d}T10:00`, arrival: `${a}T12:00` }],
          return: [],
        }),
        'fr',
        now,
      );
    const { upcoming, past } = splitTickets([
      mk('b', '2027-09-01', '2027-09-01'),
      mk('a', '2027-07-01', '2027-07-01'),
      mk('c', '2027-01-01', '2027-01-01'),
      mk('d', '2027-04-01', '2027-04-01'),
    ]);
    expect(upcoming.map((t) => t.id)).toEqual(['a', 'b']);
    expect(past.map((t) => t.id)).toEqual(['d', 'c']);
  });
});
