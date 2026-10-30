'use client';

import { Lock, Plus, X } from 'lucide-react';
import NextLink from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FuseoMark, PLANE_PATH } from '@/components/brand/FuseoMark';
import { AirportField } from '@/components/planner/AirportField';
import { getPathname, useRouter } from '@/i18n/navigation';
import type { routing } from '@/i18n/routing';
import { parseFlight } from '@/lib/airlines';
import { makePlanLabels, type Translate } from '@/lib/plan-labels';
import type { PlanInput } from '@/lib/plan-schema';
import type { PlanResponse } from '@/lib/plan-view';
import { DayTimeline, type PreviewDay } from './DayTimeline';
import styles from './FlightFinder.module.css';

type Trip = 'round' | 'oneway' | 'multi';
type Tab = 'flight' | 'route';
type Phase = 'form' | 'loading' | 'result';
type Auth = 'unknown' | 'anon' | 'user';

interface Row {
  fn: string;
  dd: string;
}
interface Leg {
  from: string;
  to: string;
  dd: string;
}
interface Found {
  ok: true;
  fn: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  durationMin: number;
  shiftHours: number;
  approx: boolean;
}
interface Missing {
  ok: false;
  fn: string;
  reason: 'notFound' | 'unavailable' | 'airport';
}

const FLIGHT_RE = /^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/;
const MIN_MS = 3800;
const SPIN = ['CDG', 'JFK', 'HND', 'DXB', 'LHR', 'SIN', 'LAX', 'BKK', 'SYD', 'GRU', 'DOH', 'IST'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;
const randTime = () =>
  `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
const now = () => performance.now();
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

/** Une rangée du « jeu » : défile très vite puis s'arrête sur sa valeur, l'une après l'autre. */
function Reel({
  final,
  lockAt,
  time = false,
  running,
}: {
  final: string | null;
  lockAt: number;
  time?: boolean;
  running: boolean;
}) {
  const [text, setText] = useState(time ? '--:--' : '···');
  const [locked, setLocked] = useState(false);
  const start = useRef(0);

  useEffect(() => {
    if (!running) return;
    start.current = now();
    const id = window.setInterval(() => {
      const late = now() - start.current >= lockAt;
      if (late && final !== null) {
        setText(final);
        setLocked(true);
        window.clearInterval(id);
      } else setText(time ? randTime() : pick(SPIN));
    }, 70);
    return () => window.clearInterval(id);
  }, [running, final, lockAt, time]);

  return (
    <span className={styles.reel} data-locked={locked} data-spinning={running && !locked}>
      {text}
    </span>
  );
}

export function FlightFinder() {
  const t = useTranslations('finder');
  const planner = useTranslations('planner');
  const locale = useLocale() as (typeof routing.locales)[number];
  const format = useFormatter();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip>('round');
  const [tab, setTab] = useState<Tab>('flight');
  const [rows, setRows] = useState<Row[]>([
    { fn: '', dd: '' },
    { fn: '', dd: '' },
    { fn: '', dd: '' },
    { fn: '', dd: '' },
  ]);
  const [legs, setLegs] = useState<Leg[]>([
    { from: '', to: '', dd: '' },
    { from: '', to: '', dd: '' },
    { from: '', to: '', dd: '' },
    { from: '', to: '', dd: '' },
  ]);
  const [back, setBack] = useState('');
  const [multiCount, setMultiCount] = useState(2);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Array<Found | Missing>>([]);
  const [peek, setPeek] = useState<Found | Missing | null>(null);
  // Utilisé seulement après un clic (animation de recherche) : pas de risque de décalage avec le rendu serveur.
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [auth, setAuth] = useState<Auth>('unknown');
  const [profile, setProfile] = useState<PlanInput['profile'] | null>(null);
  const [plan, setPlan] = useState<PlanResponse | 'loading' | 'error' | null>(null);
  const run = useRef(0);

  const count = trip === 'oneway' ? 1 : trip === 'round' ? 2 : multiCount;

  useEffect(() => {
    // Connecté ? Un cookie de session suffit à le supposer ; l'API le confirme (sans charger tout le client d'authentification).
    void (async () => {
      if (!/(^|;\s*)sb-[^=]*-auth-token/.test(document.cookie)) return setAuth('anon');
      try {
        const r = await fetch('/api/profile');
        if (r.status === 401) return setAuth('anon');
        setAuth('user');
        if (r.ok) setProfile((await r.json()) as PlanInput['profile']);
      } catch {
        setAuth('anon');
      }
    })();
  }, []);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setLeg = (i: number, patch: Partial<Leg>) =>
    setLegs((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const plannerQuery = (found: Found[]) => {
    const item = (f: Found) => `${f.fn}@${f.depDate}`;
    if (trip === 'round') {
      const [a, b] = found;
      return { out: a ? item(a) : '', ...(b ? { back: item(b) } : {}) };
    }
    return { out: found.map(item).join(',') };
  };
  const plannerHref = (query: Record<string, string>) => {
    const q = new URLSearchParams(query).toString();
    return `${getPathname({ href: '/plan', locale })}${q ? `?${q}` : ''}`;
  };

  async function lookupOne(r: Row): Promise<Found | Missing> {
    const fn = r.fn.trim().toUpperCase().replace(/\s/g, '');
    try {
      const res = await fetch(
        `/api/flight?number=${encodeURIComponent(fn)}${r.dd ? `&date=${r.dd}` : ''}&locale=${locale}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      if (res.ok) return { ok: true, fn, ...(await res.json()) } as Found;
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        fn,
        reason:
          e.error === 'unknown_airport'
            ? 'airport'
            : res.status === 404
              ? 'notFound'
              : 'unavailable',
      };
    } catch {
      return { ok: false, fn, reason: 'unavailable' };
    }
  }

  async function searchFlights() {
    const wanted = rows.slice(0, count).filter((r) => FLIGHT_RE.test(r.fn.trim()));
    if (!wanted.length) return setError(t('needFlight'));
    setError('');
    const id = ++run.current;
    setPhase('loading');
    setPeek(null);
    setPlan(null);
    const t0 = now();
    const pending = wanted.map(lookupOne);
    void pending[0]!.then((f) => id === run.current && setPeek(f));
    const found = await Promise.all(pending);
    const wait = Math.max(0, (reduced ? 500 : MIN_MS) - (now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    if (id !== run.current) return;
    setResults(found);
    setPhase('result');
    if (auth === 'user')
      void buildPlan(
        found.filter((f): f is Found => f.ok),
        id,
      );
  }

  async function buildPlan(found: Found[], id: number) {
    if (!found.length) return;
    setPlan('loading');
    const leg = (f: Found) => ({
      from: f.from,
      to: f.to,
      departure: `${f.depDate}T${f.depTime}`,
      arrival: `${f.arrDate}T${f.arrTime}`,
      flightNumber: f.fn,
    });
    const outbound = trip === 'round' ? [found[0]!] : found.slice(0, 4);
    const ret = trip === 'round' && found[1] ? [found[1]] : [];
    const body = {
      profile: profile ?? {
        bed: '23:00',
        wake: '07:00',
        chronotype: 'intermediate',
        age: null,
        caffeineUse: 'moderate',
        napHabit: 'sometimes',
        sleepQuality: 'good',
      },
      outbound: outbound.map(leg),
      return: ret.map(leg),
      preDays: 2,
      strategy: 'AUTO',
      lamp: false,
      coffee: true,
    };
    try {
      const r = await fetch(`/api/plan?locale=${locale}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (id !== run.current) return;
      setPlan(r.ok ? ((await r.json()) as PlanResponse) : 'error');
    } catch {
      setPlan('error');
    }
  }

  function goRoute() {
    const filled = legs.slice(0, trip === 'multi' ? multiCount : 1);
    if (!filled.every((l) => l.from && l.to)) return setError(t('needRoute'));
    const spec = (l: Leg) => `${l.from}-${l.to}${l.dd ? `-${l.dd}` : ''}`;
    const q: Record<string, string> = { out: filled.map(spec).join(',') };
    if (trip === 'round') q.back = `${filled[0]!.to}-${filled[0]!.from}${back ? `-${back}` : ''}`;
    router.push({ pathname: '/plan', query: q });
  }

  const dateFmt = (d: string) =>
    format.dateTime(new Date(`${d}T12:00:00Z`), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  const okFlights = results.filter((r): r is Found => r.ok);
  const next = plannerHref(okFlights.length ? plannerQuery(okFlights) : {});
  // `next` contient lui-même une adresse avec des paramètres : on l'encode en entier pour qu'aucun ne se perde.
  const login = (mode: 'login' | 'signup') =>
    `${getPathname({ href: '/connexion', locale })}?next=${encodeURIComponent(next)}${mode === 'signup' ? '&mode=signup' : ''}`;

  const reel1 = peek ? (peek.ok ? peek.from : '?') : null;
  const reel2 = peek ? (peek.ok ? peek.to : '?') : null;
  const reel3 = peek ? (peek.ok ? peek.depTime : '--:--') : null;

  const { labels, labelFor } = makePlanLabels(planner as unknown as Translate);
  const planDay =
    plan && typeof plan === 'object'
      ? (plan.days.find((d) => d.kind === 'flight') ?? plan.days[0])
      : null;
  const shiftLine = (h: number) =>
    Math.abs(h) < 0.5
      ? t('noShift')
      : t(h > 0 ? 'shiftEast' : 'shiftWest', { h: Math.abs(h).toLocaleString(locale) });

  const tripButtons: Array<[Trip, string]> = [
    ['round', t('round')],
    ['oneway', t('oneway')],
    ['multi', t('multi')],
  ];

  return (
    <section className={styles.card} aria-labelledby="finder-title" data-phase={phase}>
      <header className={styles.head}>
        <h2 id="finder-title">{t('title')}</h2>
        <p>{t('sub')}</p>
      </header>

      {phase === 'form' ? (
        <div className={styles.form}>
          <div className={styles.controls}>
            <div className={styles.seg} role="radiogroup" aria-label={t('tripLabel')}>
              {tripButtons.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={trip === k}
                  className={styles.segBtn}
                  onClick={() => {
                    setTrip(k);
                    setError('');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.tabs} role="tablist">
              {(['flight', 'route'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className={styles.tab}
                  onClick={() => {
                    setTab(k);
                    setError('');
                  }}
                >
                  {t(k === 'flight' ? 'tabFlight' : 'tabRoute')}
                </button>
              ))}
            </div>
          </div>

          {tab === 'flight' ? (
            <form
              className={styles.fields}
              onSubmit={(e) => {
                e.preventDefault();
                void searchFlights();
              }}
            >
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor={`ff-fn-${i}`}>
                      {trip === 'round'
                        ? t(i === 0 ? 'outbound' : 'inbound')
                        : t('leg', { n: i + 1 })}
                    </label>
                    <input
                      id={`ff-fn-${i}`}
                      value={rows[i]!.fn}
                      onChange={(e) => setRow(i, { fn: e.target.value })}
                      placeholder="AF1380"
                      maxLength={10}
                      autoComplete="off"
                      autoCapitalize="characters"
                      inputMode="text"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`ff-dd-${i}`}>{t('flightDate')}</label>
                    <input
                      id={`ff-dd-${i}`}
                      type="date"
                      value={rows[i]!.dd}
                      onChange={(e) => setRow(i, { dd: e.target.value })}
                    />
                  </div>
                  {trip === 'multi' && multiCount > 2 && i === multiCount - 1 ? (
                    <button
                      type="button"
                      className={styles.icon}
                      aria-label={t('removeFlight', { n: i + 1 })}
                      onClick={() => setMultiCount((c) => c - 1)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
              {trip === 'multi' && multiCount < 4 ? (
                <button
                  type="button"
                  className={styles.add}
                  onClick={() => setMultiCount((c) => c + 1)}
                >
                  <Plus size={15} aria-hidden="true" /> {t('addFlight')}
                </button>
              ) : null}
              <div className={styles.actions}>
                <button type="submit" className={styles.go}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                    <path d={PLANE_PATH} fill="currentColor" transform="rotate(90 12 12)" />
                  </svg>
                  {t('submitFlight')}
                </button>
                <span role="alert" className={styles.err}>
                  {error}
                </span>
              </div>
            </form>
          ) : (
            <form
              className={styles.fields}
              onSubmit={(e) => {
                e.preventDefault();
                goRoute();
              }}
            >
              {Array.from({ length: trip === 'multi' ? multiCount : 1 }, (_, i) => (
                <div key={i} className={`${styles.row} ${styles.routeRow}`}>
                  <AirportField
                    label={
                      trip === 'multi' ? `${t('trip', { n: i + 1 })} · ${t('from')}` : t('from')
                    }
                    value={legs[i]!.from}
                    onChange={(v) => setLeg(i, { from: v })}
                  />
                  <AirportField
                    label={t('to')}
                    value={legs[i]!.to}
                    onChange={(v) => setLeg(i, { to: v })}
                  />
                  <div className={styles.field}>
                    <label htmlFor={`ff-rd-${i}`}>{t('date')}</label>
                    <input
                      id={`ff-rd-${i}`}
                      type="date"
                      value={legs[i]!.dd}
                      onChange={(e) => setLeg(i, { dd: e.target.value })}
                    />
                  </div>
                  {trip === 'multi' && multiCount > 2 && i === multiCount - 1 ? (
                    <button
                      type="button"
                      className={styles.icon}
                      aria-label={t('removeLeg', { n: i + 1 })}
                      onClick={() => setMultiCount((c) => c - 1)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
              {trip === 'round' ? (
                <div className={styles.field} style={{ maxWidth: 240 }}>
                  <label htmlFor="ff-back">{t('retDate')}</label>
                  <input
                    id="ff-back"
                    type="date"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                  />
                </div>
              ) : null}
              {trip === 'multi' && multiCount < 4 ? (
                <button
                  type="button"
                  className={styles.add}
                  onClick={() => setMultiCount((c) => c + 1)}
                >
                  <Plus size={15} aria-hidden="true" /> {t('addLeg')}
                </button>
              ) : null}
              <div className={styles.actions}>
                <button type="submit" className={styles.go}>
                  {t('submitRoute')}
                </button>
                <span role="alert" className={styles.err}>
                  {error}
                </span>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {phase === 'loading' ? (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.orbit} aria-hidden="true" data-still={reduced}>
            <span className={styles.ringA} />
            <span className={styles.ringB} />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={styles.sat}
                style={{
                  ['--d' as string]: `${2.4 + i * 0.9}s`,
                  ['--o' as string]: `${i * 120}deg`,
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d={PLANE_PATH} fill="currentColor" />
                </svg>
              </span>
            ))}
            <span className={styles.logo}>
              <FuseoMark size={78} />
            </span>
          </div>
          <div className={styles.reels} aria-hidden="true">
            <Reel final={reel1} lockAt={1500} running={!reduced} />
            <span className={styles.arrow}>→</span>
            <Reel final={reel2} lockAt={2400} running={!reduced} />
            <Reel final={reel3} lockAt={3300} time running={!reduced} />
          </div>
          <p className={styles.loadTitle}>{t('loading')}</p>
          <p className={styles.loadSub}>{t('loadingSub')}</p>
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <h3>{t(results.length > 1 ? 'resultMany' : 'resultOne')}</h3>
            <button type="button" className={styles.link} onClick={() => setPhase('form')}>
              {t('edit')}
            </button>
          </div>
          <div className={styles.flights}>
            {results.map((r, i) => {
              const air = parseFlight(r.fn);
              return (
                <article key={i} className={styles.flight}>
                  <header>
                    <span
                      className={styles.airline}
                      style={
                        air
                          ? ({
                              ['--bg' as string]: air.airline.bg,
                              ['--fg' as string]: air.airline.fg,
                            } as React.CSSProperties)
                          : undefined
                      }
                    >
                      {air?.display ?? r.fn}
                    </span>
                    {r.ok ? (
                      <span className={styles.route}>
                        {r.fromCity} <b>{r.from}</b> <i aria-hidden="true">→</i> {r.toCity}{' '}
                        <b>{r.to}</b>
                      </span>
                    ) : null}
                  </header>
                  {r.ok ? (
                    <>
                      <dl className={styles.facts}>
                        <div>
                          <dt>{t('departs')}</dt>
                          <dd>
                            {r.depTime}
                            <small>{dateFmt(r.depDate)}</small>
                          </dd>
                        </div>
                        <div>
                          <dt>{t('arrives')}</dt>
                          <dd>
                            {r.arrTime}
                            <small>{dateFmt(r.arrDate)}</small>
                          </dd>
                        </div>
                        <div>
                          <dt>{t('duration')}</dt>
                          <dd>{hm(r.durationMin)}</dd>
                        </div>
                        <div>
                          <dt>{t('shift')}</dt>
                          <dd>{shiftLine(r.shiftHours)}</dd>
                        </div>
                      </dl>
                      {r.approx ? <p className={styles.note}>{t('approx')}</p> : null}
                    </>
                  ) : (
                    <p className={styles.miss}>
                      {t(r.reason)}{' '}
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => {
                          setTab('route');
                          setPhase('form');
                        }}
                      >
                        {t('useRoute')}
                      </button>
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {okFlights.length ? (
            auth === 'user' ? (
              <div className={styles.plan}>
                <h3>{t('planTitle')}</h3>
                {plan === 'loading' ? <p role="status">{t('planLoading')}</p> : null}
                {plan === 'error' ? (
                  <p role="alert" className={styles.err}>
                    {t('planError')}
                  </p>
                ) : null}
                {planDay ? (
                  <div className={styles.planDay}>
                    <b>{dateFmt(planDay.date)}</b>
                    <DayTimeline
                      day={planDay as unknown as PreviewDay}
                      labels={labels}
                      labelFor={labelFor}
                    />
                  </div>
                ) : null}
                <NextLink href={next} className={styles.go}>
                  {t('openPlan')}
                </NextLink>
              </div>
            ) : (
              <div className={styles.locked}>
                {/* Faux contenu flouté : aucune donnée réelle n'est chargée tant que le visiteur n'est pas connecté. */}
                <div className={styles.decoy} aria-hidden="true" inert>
                  <div className={styles.decoyBar}>
                    <i style={{ left: '4%', width: '30%' }} />
                    <i style={{ left: '38%', width: '34%', background: 'var(--amber)' }} />
                    <i style={{ left: '78%', width: '8%', background: 'var(--caf)' }} />
                  </div>
                  {[
                    planner('itemSleep'),
                    planner('itemSeek'),
                    planner('itemAvoid'),
                    planner('itemCaf'),
                  ].map((l, i) => (
                    <p key={i}>
                      <b>00:00–00:00</b> {l}
                    </p>
                  ))}
                </div>
                <div className={styles.lockCard}>
                  <span className={styles.lockIcon} aria-hidden="true">
                    <Lock size={20} />
                  </span>
                  <h3>{t('lockedTitle')}</h3>
                  <p>{t('lockedText')}</p>
                  <div className={styles.lockActions}>
                    {/* Lien simple : le composant de lien de Next.js décode l'adresse de retour et ferait perdre le second paramètre. */}
                    <a href={login('login')} className={styles.go}>
                      {t('signIn')}
                    </a>
                    <a href={login('signup')} className={styles.ghost}>
                      {t('signUp')}
                    </a>
                  </div>
                  <small>{t('free')}</small>
                </div>
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
