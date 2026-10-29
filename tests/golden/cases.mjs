// Jeux d'entrées du golden master. Aucune donnée réelle : profils et vols fictifs.
const AP = {
  CDG: { code: 'CDG', tz: 'Europe/Paris', city: 'Paris' },
  LHR: { code: 'LHR', tz: 'Europe/London', city: 'Londres' },
  JFK: { code: 'JFK', tz: 'America/New_York', city: 'New York' },
  LAX: { code: 'LAX', tz: 'America/Los_Angeles', city: 'Los Angeles' },
  SFO: { code: 'SFO', tz: 'America/Los_Angeles', city: 'San Francisco' },
  HND: { code: 'HND', tz: 'Asia/Tokyo', city: 'Tokyo' },
  SIN: { code: 'SIN', tz: 'Asia/Singapore', city: 'Singapour' },
  SYD: { code: 'SYD', tz: 'Australia/Sydney', city: 'Sydney' },
  DXB: { code: 'DXB', tz: 'Asia/Dubai', city: 'Dubaï' },
  GRU: { code: 'GRU', tz: 'America/Sao_Paulo', city: 'São Paulo' },
  DEL: { code: 'DEL', tz: 'Asia/Kolkata', city: 'Delhi' },
};

const leg = (from, to, departure, arrival, flightNumber) => ({
  from: AP[from],
  to: AP[to],
  departure,
  arrival,
  ...(flightNumber ? { flightNumber } : {}),
});

const base = {
  usualBedtime: '23:00',
  usualWakeTime: '07:00',
  chronotype: 'intermediate',
  age: 35,
  napHabit: 'sometimes',
  sleepQuality: 'good',
  caffeineUse: 'moderate',
  melatoninPreference: 'ask',
  timezone: 'Europe/Paris',
};

const cdgJfk = { outbound: [leg('CDG', 'JFK', '2027-06-12T10:30', '2027-06-12T12:50', 'AF008')] };
const cdgJfkRt = {
  outbound: cdgJfk.outbound,
  return: [leg('JFK', 'CDG', '2027-06-19T18:30', '2027-06-20T07:50', 'AF009')],
};
const cdgHnd = { outbound: [leg('CDG', 'HND', '2027-03-10T13:00', '2027-03-11T08:10', 'AF292')] };
const cdgHndRt = {
  outbound: cdgHnd.outbound,
  return: [leg('HND', 'CDG', '2027-03-20T11:30', '2027-03-20T17:20', 'AF293')],
};
const cdgLaxRt = {
  outbound: [leg('CDG', 'LAX', '2027-05-08T11:00', '2027-05-08T13:30', 'AF066')],
  return: [leg('LAX', 'CDG', '2027-05-22T16:00', '2027-05-23T12:15', 'AF067')],
};
const lhrJfkRt = {
  outbound: [leg('LHR', 'JFK', '2027-09-14T09:00', '2027-09-14T11:55', 'BA175')],
  return: [leg('JFK', 'LHR', '2027-09-16T21:30', '2027-09-17T09:25', 'BA176')],
};

export const cases = [
  { id: 'c01-cdg-jfk-aller', kind: 'plan', profile: base, itinerary: cdgJfk, preferences: {} },
  {
    id: 'c02-cdg-jfk-aller-retour',
    kind: 'plan',
    profile: base,
    itinerary: cdgJfkRt,
    preferences: {},
  },
  { id: 'c03-cdg-hnd-aller', kind: 'plan', profile: base, itinerary: cdgHnd, preferences: {} },
  {
    id: 'c04-cdg-hnd-aller-retour-evenement',
    kind: 'plan',
    profile: base,
    itinerary: {
      ...cdgHndRt,
      events: [
        {
          label: 'Réunion',
          local: '2027-03-12T09:00',
          tz: 'Asia/Tokyo',
          durationMin: 180,
          importance: 'critical',
        },
      ],
    },
    preferences: { mode: 'PERFORM' },
  },
  {
    id: 'c05-cdg-lax-aller-retour',
    kind: 'plan',
    profile: base,
    itinerary: cdgLaxRt,
    preferences: {},
  },
  {
    id: 'c06-cdg-sin-matinal',
    kind: 'plan',
    profile: { ...base, chronotype: 'morning', usualBedtime: '22:00', usualWakeTime: '06:00' },
    itinerary: { outbound: [leg('CDG', 'SIN', '2027-06-04T22:30', '2027-06-05T17:30', 'SQ335')] },
    preferences: {},
  },
  {
    id: 'c07-cdg-dxb-syd-escale',
    kind: 'plan',
    profile: base,
    itinerary: {
      outbound: [
        leg('CDG', 'DXB', '2027-06-20T14:00', '2027-06-20T23:30', 'EK074'),
        leg('DXB', 'SYD', '2027-06-21T02:40', '2027-06-21T23:10', 'EK412'),
      ],
    },
    preferences: {},
  },
  {
    id: 'c08-lhr-jfk-court-sejour-perform',
    kind: 'plan',
    profile: base,
    itinerary: {
      ...lhrJfkRt,
      events: [
        {
          label: 'Présentation',
          local: '2027-09-15T10:00',
          tz: 'America/New_York',
          durationMin: 120,
          importance: 'critical',
        },
      ],
    },
    preferences: { mode: 'PERFORM' },
  },
  {
    id: 'c09-cdg-dxb-preparation-2j',
    kind: 'plan',
    profile: base,
    itinerary: { outbound: [leg('CDG', 'DXB', '2027-11-06T09:10', '2027-11-06T18:40', 'EK072')] },
    preferences: { preDays: 2 },
  },
  {
    id: 'c10-cdg-gru-du-soir',
    kind: 'plan',
    profile: { ...base, chronotype: 'evening', usualBedtime: '01:00', usualWakeTime: '09:00' },
    itinerary: { outbound: [leg('CDG', 'GRU', '2027-01-15T23:55', '2027-01-16T06:00', 'AF454')] },
    preferences: {},
  },
  {
    id: 'c11-cdg-sfo-perform-conference',
    kind: 'plan',
    profile: base,
    itinerary: {
      outbound: [leg('CDG', 'SFO', '2027-04-12T13:00', '2027-04-12T15:30', 'AF084')],
      return: [leg('SFO', 'CDG', '2027-04-17T15:00', '2027-04-18T10:20', 'AF085')],
      events: [
        {
          label: 'Conférence',
          local: '2027-04-14T09:00',
          tz: 'America/Los_Angeles',
          durationMin: 240,
          importance: 'critical',
        },
      ],
    },
    preferences: { mode: 'PERFORM' },
  },
  {
    id: 'c12-jfk-cdg-vol-de-nuit',
    kind: 'plan',
    profile: base,
    itinerary: { outbound: [leg('JFK', 'CDG', '2027-10-05T19:00', '2027-10-06T08:20', 'AF007')] },
    preferences: {},
  },
  {
    id: 'c13-melatonine-autorisee',
    kind: 'plan',
    profile: base,
    itinerary: cdgHnd,
    preferences: { melatonin: { enabled: true }, medical: {} },
  },
  {
    id: 'c14-melatonine-grossesse',
    kind: 'plan',
    profile: { ...base, age: 30 },
    itinerary: cdgHnd,
    preferences: { melatonin: { enabled: true }, medical: { pregnant: true } },
  },
  {
    id: 'c15-melatonine-sans-questionnaire',
    kind: 'plan',
    profile: base,
    itinerary: cdgHnd,
    preferences: { melatonin: { enabled: true }, medical: null },
  },
  {
    id: 'c16-melatonine-avis-medical-3mg',
    kind: 'plan',
    profile: base,
    itinerary: cdgHnd,
    preferences: { melatonin: { enabled: true, physicianApproved: true, doseMg: 3 }, medical: {} },
  },
  {
    id: 'c17-lampe-luminotherapie',
    kind: 'plan',
    profile: base,
    itinerary: cdgHndRt,
    preferences: { hasLightBox: true },
  },
  {
    id: 'c18-sans-cafeine',
    kind: 'plan',
    profile: base,
    itinerary: cdgJfkRt,
    preferences: { caffeine: false },
  },
  {
    id: 'c19-cdg-hnd-preparation-3j',
    kind: 'plan',
    profile: base,
    itinerary: cdgHndRt,
    preferences: { preDays: 3 },
  },
  {
    id: 'c20-creneaux-bloques',
    kind: 'plan',
    profile: base,
    itinerary: cdgLaxRt,
    preferences: {
      blockedWindows: [
        {
          start: Date.UTC(2027, 4, 9, 20, 0),
          end: Date.UTC(2027, 4, 9, 23, 0),
          label: 'Dîner professionnel',
        },
        {
          start: Date.UTC(2027, 4, 10, 15, 0),
          end: Date.UTC(2027, 4, 10, 18, 0),
          label: 'Réunion',
        },
      ],
    },
  },
  {
    id: 'c21-senior-sommeil-fragile',
    kind: 'plan',
    profile: {
      ...base,
      age: 70,
      sleepQuality: 'poor',
      caffeineUse: 'high',
      napHabit: 'often',
      usualBedtime: '22:00',
      usualWakeTime: '06:00',
    },
    itinerary: cdgJfkRt,
    preferences: {},
  },
  {
    id: 'c22-jours-libres',
    kind: 'plan',
    profile: { ...base, freeDayBedtime: '01:00', freeDayWakeTime: '10:00' },
    itinerary: cdgJfkRt,
    preferences: {},
  },
  {
    id: 'c23-sfo-syd-ligne-de-date',
    kind: 'plan',
    profile: { ...base, timezone: 'America/Los_Angeles' },
    itinerary: { outbound: [leg('SFO', 'SYD', '2027-07-01T22:30', '2027-07-03T06:30', 'QF74')] },
    preferences: {},
  },
  {
    id: 'c24-strategie-complete',
    kind: 'plan',
    profile: base,
    itinerary: cdgJfkRt,
    preferences: { strategy: 'FULL_ADAPTATION' },
  },
  {
    id: 'c25-strategie-partielle',
    kind: 'plan',
    profile: base,
    itinerary: cdgHndRt,
    preferences: { strategy: 'PARTIAL_ADAPTATION' },
  },
  {
    id: 'c26-strategie-heure-depart',
    kind: 'plan',
    profile: base,
    itinerary: lhrJfkRt,
    preferences: { strategy: 'HOME_TIME_MAINTENANCE' },
  },
  {
    id: 'c27-cdg-del-demi-fuseau',
    kind: 'plan',
    profile: base,
    itinerary: { outbound: [leg('CDG', 'DEL', '2027-02-02T10:30', '2027-02-02T23:00', 'AF218')] },
    preferences: {},
  },
  {
    id: 'c28-vol-heure-ete-inexistante',
    kind: 'plan',
    profile: base,
    itinerary: { outbound: [leg('CDG', 'JFK', '2027-03-28T02:30', '2027-03-28T05:40', 'AF006')] },
    preferences: {},
  },
  {
    id: 'c29-recalcul-observations',
    kind: 'recalc',
    from: 'c02-cdg-jfk-aller-retour',
    changes: {
      now: Date.UTC(2027, 5, 13, 14, 0),
      observations: [
        { type: 'WOKE_EARLY', at: Date.UTC(2027, 5, 13, 9, 0) },
        {
          type: 'LIGHT_MISSED',
          start: Date.UTC(2027, 5, 13, 12, 0),
          end: Date.UTC(2027, 5, 13, 13, 0),
        },
      ],
    },
  },
  {
    id: 'c30-recalcul-evenement-ajoute',
    kind: 'recalc',
    from: 'c02-cdg-jfk-aller-retour',
    changes: {
      now: Date.UTC(2027, 5, 14, 12, 0),
      events: [
        {
          label: 'Dîner',
          local: '2027-06-15T20:00',
          tz: 'America/New_York',
          durationMin: 120,
          importance: 'critical',
        },
      ],
    },
  },
  {
    id: 'c31-erreur-arrivee-avant-depart',
    kind: 'plan',
    profile: base,
    itinerary: { outbound: [leg('CDG', 'JFK', '2027-06-12T10:30', '2027-06-12T02:00')] },
    preferences: {},
  },
  {
    id: 'c32-erreur-duree-sommeil',
    kind: 'plan',
    profile: { ...base, usualBedtime: '23:00', usualWakeTime: '02:00' },
    itinerary: cdgJfk,
    preferences: {},
  },
];
