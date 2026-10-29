'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PlanInput } from '@/lib/plan-schema';
import type { PlanResponse } from '@/lib/plan-view';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { AirportField } from './AirportField';
import { PdfActions } from './PdfActions';
import { ResultView } from './ResultView';
import styles from './Planner.module.css';

interface Leg {
  from: string;
  to: string;
  dd: string;
  dt: string;
  ad: string;
  at: string;
  fn: string;
}
interface Form {
  bed: string;
  wake: string;
  chrono: 'morning' | 'intermediate' | 'evening';
  age: string;
  caf: 'none' | 'low' | 'moderate' | 'high';
  nap: 'never' | 'sometimes' | 'often';
  sq: 'good' | 'fair' | 'poor';
  outbound: Leg[];
  ret: Leg[];
  pre: number;
  strategy: 'AUTO' | 'FULL_ADAPTATION' | 'PARTIAL_ADAPTATION' | 'HOME_TIME_MAINTENANCE';
  lamp: boolean;
  coffee: boolean;
}

const DRAFT_KEY = 'fuseo-plan-draft-v1';
const emptyLeg = (from = '', to = ''): Leg => ({
  from,
  to,
  dd: '',
  dt: '',
  ad: '',
  at: '',
  fn: '',
});
const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Exemple de départ : Paris → Tokyo à J+30, retour 10 jours plus tard (comme le prototype). */
const exampleForm = (): Form => ({
  bed: '23:00',
  wake: '07:00',
  chrono: 'intermediate',
  age: '',
  caf: 'moderate',
  nap: 'sometimes',
  sq: 'good',
  outbound: [
    { from: 'CDG', to: 'HND', dd: iso(30), dt: '19:30', ad: iso(31), at: '15:25', fn: '' },
  ],
  ret: [{ from: 'HND', to: 'CDG', dd: iso(40), dt: '10:30', ad: iso(40), at: '16:35', fn: '' }],
  pre: 2,
  strategy: 'AUTO',
  lamp: false,
  coffee: true,
});

const toLeg = (l: Leg) => ({
  from: l.from,
  to: l.to,
  departure: `${l.dd}T${l.dt}`,
  arrival: `${l.ad}T${l.at}`,
  ...(l.fn ? { flightNumber: l.fn.toUpperCase().replace(/\s/g, '') } : {}),
});
const buildInput = (f: Form) => ({
  profile: {
    bed: f.bed,
    wake: f.wake,
    chronotype: f.chrono,
    age: f.age ? Number(f.age) : null,
    caffeineUse: f.caf,
    napHabit: f.nap,
    sleepQuality: f.sq,
  },
  outbound: f.outbound.map(toLeg),
  return: f.ret.map(toLeg),
  preDays: f.pre,
  strategy: f.strategy,
  lamp: f.lamp,
  coffee: f.coffee,
});
const fromLeg = (l: PlanInput['outbound'][number]): Leg => ({
  from: l.from,
  to: l.to,
  dd: l.departure.slice(0, 10),
  dt: l.departure.slice(11),
  ad: l.arrival.slice(0, 10),
  at: l.arrival.slice(11),
  fn: l.flightNumber ?? '',
});
const profileToForm = (p: PlanInput['profile']): Partial<Form> => ({
  bed: p.bed,
  wake: p.wake,
  chrono: p.chronotype,
  age: p.age ? String(p.age) : '',
  caf: p.caffeineUse,
  nap: p.napHabit,
  sq: p.sleepQuality,
});
const inputToForm = (i: PlanInput): Form => ({
  ...(profileToForm(i.profile) as Required<ReturnType<typeof profileToForm>>),
  outbound: i.outbound.map(fromLeg),
  ret: i.return.map(fromLeg),
  pre: i.preDays,
  strategy: i.strategy,
  lamp: i.lamp,
  coffee: i.coffee,
});

type LookupKind = 'busy' | 'ok' | 'approx' | 'fail' | 'quota' | 'airport';
const FLIGHT_RE = /^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/;

type SaveState = 'idle' | 'saving' | 'saved' | 'login' | 'consent' | 'error';

export function PlannerApp() {
  const t = useTranslations('planner');
  const account = useTranslations('account');
  const nav = useTranslations('nav');
  const locale = useLocale();
  const tripId = useSearchParams().get('trip');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Recherche de vol : une par étape, déclenchée toute seule quand le numéro est saisi.
  const [lookups, setLookups] = useState<Record<string, LookupKind>>({});
  const lookupTimers = useRef<Record<string, number>>({});
  const lookupKeys = useRef<Record<string, string>>({});
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved: Form | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Form | null;
    } catch {
      /* brouillon illisible */
    }
    const base = saved?.outbound?.length ? saved : exampleForm();
    setForm(base);

    void (async () => {
      const { data } = await createSupabaseBrowserClient().auth.getUser();
      if (!data.user) return;
      if (tripId) {
        const r = await fetch(`/api/trips/${encodeURIComponent(tripId)}`);
        if (!r.ok) return;
        const f = inputToForm((await r.json()) as PlanInput);
        setForm(f);
        void generate(f);
      } else if (!saved?.outbound?.length) {
        const r = await fetch('/api/profile');
        if (r.ok) setForm({ ...base, ...profileToForm((await r.json()) as PlanInput['profile']) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* stockage indisponible */
    }
  }, [form]);

  if (!form) return <div className={styles.app} aria-busy="true" />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const setLeg = (g: 'outbound' | 'ret', i: number, patch: Partial<Leg>) =>
    setForm((f) => (f ? { ...f, [g]: f[g].map((l, j) => (j === i ? { ...l, ...patch } : l)) } : f));
  const addLeg = (g: 'outbound' | 'ret') =>
    setForm((f) => {
      if (!f) return f;
      const prev = f[g][f[g].length - 1];
      const first = f.outbound[0];
      const leg =
        g === 'ret' && !f.ret.length
          ? emptyLeg(f.outbound.at(-1)?.to, first?.from)
          : emptyLeg(prev?.to);
      return { ...f, [g]: [...f[g], { ...leg, dd: prev?.ad ?? '', ad: prev?.ad ?? '' }] };
    });
  const removeLeg = (g: 'outbound' | 'ret', i: number) =>
    setForm((f) => (f ? { ...f, [g]: f[g].filter((_, j) => j !== i) } : f));

  const complete = (l: Leg) => l.from && l.to && l.dd && l.dt && l.ad && l.at;

  /** Remplit l'étape (aéroports, dates et heures) à partir du numéro de vol. */
  async function lookup(
    g: 'outbound' | 'ret',
    i: number,
    { fn, dd, force = false }: { fn: string; dd: string; force?: boolean },
  ) {
    const id = `${g}${i}`;
    if (!FLIGHT_RE.test(fn)) return;
    const key = `${fn.toUpperCase().replace(/\s/g, '')}|${dd}`;
    if (!force && lookupKeys.current[id] === key) return;
    lookupKeys.current[id] = key;
    setLookups((m) => ({ ...m, [id]: 'busy' }));
    try {
      const r = await fetch(
        `/api/flight?number=${encodeURIComponent(fn)}${dd ? `&date=${dd}` : ''}`,
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        const kind: LookupKind =
          e.error === 'unknown_airport' ? 'airport' : r.status === 404 ? 'fail' : 'quota';
        return setLookups((m) => ({ ...m, [id]: kind }));
      }
      const f = (await r.json()) as {
        from: string;
        to: string;
        depDate: string;
        depTime: string;
        arrDate: string;
        arrTime: string;
        approx?: boolean;
      };
      setLeg(g, i, {
        from: f.from,
        to: f.to,
        dd: f.depDate,
        dt: f.depTime,
        ad: f.arrDate,
        at: f.arrTime,
      });
      lookupKeys.current[id] = `${fn.toUpperCase().replace(/\s/g, '')}|${f.depDate}`;
      setLookups((m) => ({ ...m, [id]: f.approx ? 'approx' : 'ok' }));
    } catch {
      setLookups((m) => ({ ...m, [id]: 'quota' }));
    }
  }

  /** Lance la recherche 0,7 s après la dernière frappe (le numéro doit avoir une forme valide). */
  function scheduleLookup(g: 'outbound' | 'ret', i: number, fn: string, dd: string) {
    const id = `${g}${i}`;
    window.clearTimeout(lookupTimers.current[id]);
    if (!FLIGHT_RE.test(fn)) {
      setLookups((m) => {
        const { [id]: _drop, ...rest } = m;
        return rest;
      });
      return;
    }
    lookupTimers.current[id] = window.setTimeout(() => void lookup(g, i, { fn, dd }), 700);
  }

  async function generate(f: Form = form!) {
    setError('');
    setSaveState('idle');
    if (![...f.outbound, ...f.ret].every(complete)) return setError(t('error'));
    setBusy(true);
    try {
      const r = await fetch(`/api/plan?locale=${locale}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildInput(f)),
      });
      if (r.status === 429) return setError(t('tooMany'));
      if (!r.ok) return setError(t('error'));
      setPlan((await r.json()) as PlanResponse);
      setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaveState('saving');
    try {
      const r = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildInput(form!)),
      });
      if (r.ok) return setSaveState('saved');
      if (r.status === 401) return setSaveState('login');
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      setSaveState(body.error === 'consent_required' ? 'consent' : 'error');
    } catch {
      setSaveState('error');
    }
  }

  async function grantAndSave() {
    const { grantHealthConsent } = await import('@/app/actions/account');
    const r = await grantHealthConsent();
    if (!r.ok) return setSaveState('error');
    await save();
  }

  const legCard = (g: 'outbound' | 'ret', l: Leg, i: number) => (
    <fieldset key={`${g}${i}`} className={styles.leg}>
      <legend>
        {g === 'outbound' ? t('outbound') : t('return')}{' '}
        {form.outbound.length + form.ret.length > 2 ||
        (g === 'outbound' ? form.outbound.length : form.ret.length) > 1
          ? i + 1
          : ''}
      </legend>
      <div className={styles.legGrid}>
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor={`${g}${i}fn`}>{t('flightNumber')}</label>
          <div className={styles.inline}>
            <input
              id={`${g}${i}fn`}
              value={l.fn}
              maxLength={10}
              placeholder="AF1380"
              autoComplete="off"
              onChange={(e) => {
                setLeg(g, i, { fn: e.target.value });
                scheduleLookup(g, i, e.target.value, l.dd);
              }}
            />
            <button
              type="button"
              className={styles.ghost}
              onClick={() => lookup(g, i, { fn: l.fn, dd: l.dd, force: true })}
              disabled={!FLIGHT_RE.test(l.fn)}
            >
              {t('lookup')}
            </button>
          </div>
          <p className={styles.hint} role="status" aria-live="polite">
            {lookups[`${g}${i}`] ? t(`lookup_${lookups[`${g}${i}`]}`) : t('lookupHint')}
          </p>
        </div>
        <AirportField
          label={t('from')}
          value={l.from}
          onChange={(v) => setLeg(g, i, { from: v })}
        />
        <AirportField label={t('to')} value={l.to} onChange={(v) => setLeg(g, i, { to: v })} />
        <div className={styles.field}>
          <label htmlFor={`${g}${i}dd`}>{t('depDate')}</label>
          <input
            id={`${g}${i}dd`}
            type="date"
            value={l.dd}
            onChange={(e) => {
              setLeg(g, i, { dd: e.target.value });
              if (l.fn) scheduleLookup(g, i, l.fn, e.target.value);
            }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${g}${i}dt`}>{t('depTime')}</label>
          <input
            id={`${g}${i}dt`}
            type="time"
            value={l.dt}
            onChange={(e) => setLeg(g, i, { dt: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${g}${i}ad`}>{t('arrDate')}</label>
          <input
            id={`${g}${i}ad`}
            type="date"
            value={l.ad}
            onChange={(e) => setLeg(g, i, { ad: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${g}${i}at`}>{t('arrTime')}</label>
          <input
            id={`${g}${i}at`}
            type="time"
            value={l.at}
            onChange={(e) => setLeg(g, i, { at: e.target.value })}
          />
        </div>
      </div>
      <p className={styles.small}>{t('localHint')}</p>
      {g === 'ret' || form.outbound.length > 1 ? (
        <button type="button" className={styles.link} onClick={() => removeLeg(g, i)}>
          {t('remove')}
        </button>
      ) : null}
    </fieldset>
  );

  const select = (
    id: string,
    label: string,
    value: string,
    opts: Array<[string, string]>,
    on: (v: string) => void,
  ) => (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => on(e.target.value)}>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={styles.app} ref={top}>
      {plan ? (
        <>
          <ResultView plan={plan} onEdit={() => setPlan(null)} />
          <div className={styles.savebox}>
            <div className={styles.shareRow}>
              <PdfActions
                source={{ kind: 'input', input: buildInput(form) }}
                buttonClass={styles.ghost}
              />
            </div>
            {saveState === 'saved' ? (
              <p role="status">
                {t('saved')}{' '}
                <Link href="/compte" className={styles.link}>
                  {account('title')}
                </Link>
              </p>
            ) : saveState === 'login' ? (
              <p role="status">
                {t('needLogin')}{' '}
                <Link
                  href={{ pathname: '/connexion', query: { next: '/plan' } }}
                  className={styles.link}
                >
                  {nav('login')}
                </Link>
              </p>
            ) : saveState === 'consent' ? (
              <div>
                <label className={styles.check2}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{' '}
                  {account('consentText')}
                </label>
                <button
                  type="button"
                  className={styles.submit}
                  disabled={!consent}
                  onClick={() => void grantAndSave()}
                >
                  {account('grant')}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={saveState === 'saving'}
                  onClick={() => void save()}
                >
                  {t('save')}
                </button>
                {saveState === 'error' ? (
                  <p role="alert" className={styles.error}>
                    {t('saveError')}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <section>
            <h2>
              <span>1</span> {t('step1')}
            </h2>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label htmlFor="bed">{t('bed')}</label>
                <input
                  id="bed"
                  type="time"
                  value={form.bed}
                  onChange={(e) => set('bed', e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="wake">{t('wake')}</label>
                <input
                  id="wake"
                  type="time"
                  value={form.wake}
                  onChange={(e) => set('wake', e.target.value)}
                  required
                />
              </div>
            </div>
            <details className={styles.more}>
              <summary>{t('refine')}</summary>
              <div className={styles.grid2}>
                {select(
                  'chrono',
                  t('chrono'),
                  form.chrono,
                  [
                    ['morning', t('chronoMorning')],
                    ['intermediate', t('chronoMid')],
                    ['evening', t('chronoEvening')],
                  ],
                  (v) => set('chrono', v as Form['chrono']),
                )}
                <div className={styles.field}>
                  <label htmlFor="age">{t('age')}</label>
                  <input
                    id="age"
                    type="number"
                    min={12}
                    max={100}
                    inputMode="numeric"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                  />
                </div>
                {select(
                  'caf',
                  t('caf'),
                  form.caf,
                  [
                    ['none', t('cafNone')],
                    ['low', t('cafLow')],
                    ['moderate', t('cafMod')],
                    ['high', t('cafHigh')],
                  ],
                  (v) => set('caf', v as Form['caf']),
                )}
                {select(
                  'nap',
                  t('nap'),
                  form.nap,
                  [
                    ['never', t('napNever')],
                    ['sometimes', t('napSome')],
                    ['often', t('napOften')],
                  ],
                  (v) => set('nap', v as Form['nap']),
                )}
                {select(
                  'sq',
                  t('sq'),
                  form.sq,
                  [
                    ['good', t('sqGood')],
                    ['fair', t('sqFair')],
                    ['poor', t('sqPoor')],
                  ],
                  (v) => set('sq', v as Form['sq']),
                )}
              </div>
              <p className={styles.small}>{t('profileHint')}</p>
            </details>
          </section>

          <section>
            <h2>
              <span>2</span> {t('step2')}
            </h2>
            {form.outbound.map((l, i) => legCard('outbound', l, i))}
            {form.outbound.length < 4 ? (
              <button type="button" className={styles.ghost} onClick={() => addLeg('outbound')}>
                {t('addLeg')}
              </button>
            ) : null}
            {form.ret.map((l, i) => legCard('ret', l, i))}
            {form.ret.length < 4 ? (
              <button type="button" className={styles.ghost} onClick={() => addLeg('ret')}>
                {form.ret.length ? t('addLeg') : t('addReturn')}
              </button>
            ) : null}
          </section>

          <section>
            <h2>
              <span>3</span> {t('step3')}
            </h2>
            <div className={styles.grid2}>
              {select(
                'pre',
                t('pre'),
                String(form.pre),
                [
                  ['0', t('pre0')],
                  ['1', t('pre1')],
                  ['2', t('pre2')],
                  ['3', t('pre3')],
                ],
                (v) => set('pre', Number(v)),
              )}
              {select(
                'strategy',
                t('strategy'),
                form.strategy,
                [
                  ['AUTO', t('stratAuto')],
                  ['FULL_ADAPTATION', t('stratAdapt')],
                  ['PARTIAL_ADAPTATION', t('stratHalf')],
                  ['HOME_TIME_MAINTENANCE', t('stratHome')],
                ],
                (v) => set('strategy', v as Form['strategy']),
              )}
            </div>
            <label className={styles.check2}>
              <input
                type="checkbox"
                checked={form.lamp}
                onChange={(e) => set('lamp', e.target.checked)}
              />{' '}
              {t('lamp')}
            </label>
            <label className={styles.check2}>
              <input
                type="checkbox"
                checked={form.coffee}
                onChange={(e) => set('coffee', e.target.checked)}
              />{' '}
              {t('coffee')}
            </label>
          </section>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? t('generating') : t('generate')}
          </button>
        </form>
      )}
    </div>
  );
}
