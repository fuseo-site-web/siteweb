import {
  AlarmClock,
  CalendarDays,
  Coffee,
  Dumbbell,
  Glasses,
  MapPin,
  Moon,
  Plane,
  Sun,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { cacheLife } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { makePlanLabels, type Translate } from '@/lib/plan-labels';
import { runPlan, type DayView, type PlanResponse } from '@/lib/plan-view';
import { BoardingPass } from './BoardingPass';
import { DayTimeline, type PreviewDay } from './DayTimeline';
import pp from './PlanPreview.module.css';
import styles from './Sections.module.css';

/** Exemple réel calculé par le moteur : Paris → Tokyo, départ le soir, coucher 23 h, lever 7 h. */
async function examplePlan(locale: string): Promise<PlanResponse | null> {
  'use cache';
  // Dates fixes : le résultat ne change qu'avec le code. Sans durée, ce cache limiterait l'accueil à 15 min.
  cacheLife('max');
  const plan = runPlan(
    {
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
        { from: 'CDG', to: 'HND', departure: '2027-03-10T19:30', arrival: '2027-03-11T15:25' },
      ],
      return: [],
      preDays: 0,
      strategy: 'AUTO',
      lamp: false,
      coffee: true,
    },
    locale,
    { full: true },
  );
  return plan.ok ? plan : null;
}

/** L'essentiel d'une journée : dormir, lumière, dernier café (et le vol). Le reste est dans le détail. */
const ESSENTIAL = new Set(['sleep', 'sleepf', 'seek', 'caf', 'flight']);
/** Frise de l'exemple : uniquement les couleurs de la légende (vol dessous, sommeil par-dessus). */
const SEG_ORDER = ['flight', 'avoid', 'seek', 'sleep', 'sleepf'];
const legendDay = (d: DayView) => ({
  ...d,
  segs: d.segs
    .filter((s) => SEG_ORDER.includes(s.t))
    .sort((a, b) => SEG_ORDER.indexOf(a.t) - SEG_ORDER.indexOf(b.t)),
  marks: d.marks.filter((m) => m.t === 'caf'),
});
const ICON: Record<string, LucideIcon> = {
  sleep: Moon,
  sleepf: Moon,
  wind: Moon,
  wake: AlarmClock,
  seek: Sun,
  avoid: Glasses,
  caf: Coffee,
  cafok: Coffee,
  alc: Wine,
  alcno: Wine,
  sport: Dumbbell,
  sportcut: Dumbbell,
  breakfast: Utensils,
  breakfast1: Utensils,
  lunch: Utensils,
  dinner: Utensils,
  mealf: Utensils,
  meal: Utensils,
  meal1: Utensils,
  flight: Plane,
  nap: Moon,
};

export async function PlanPreview() {
  const locale = await getLocale();
  const t = await getTranslations();
  const tp = await getTranslations('planner');
  const plan = await examplePlan(locale);
  if (!plan) return null;
  const { labels, labelFor } = makePlanLabels(tp as unknown as Translate);

  // Jour du départ (vol le soir), nuit à bord et arrivée, premier jour complet à destination.
  const pick = [
    [...plan.days].reverse().find((d) => d.kind === 'before'),
    plan.days.find((d) => d.kind === 'flight'),
    plan.days.find((d) => d.kind === 'stay'),
  ].filter((d): d is DayView => !!d);
  const CARDS = [
    { title: 'cardBefore', Icon: CalendarDays },
    { title: 'cardFlight', Icon: Plane },
    { title: 'cardDest', Icon: MapPin },
  ] as const;
  const dayDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
  const LEGEND = [
    ['sleep', Moon],
    ['seek', Sun],
    ['avoid', Glasses],
    ['caf', Coffee],
    ['flight', Plane],
  ] as const;
  const stayDays = plan.days.filter((d) => d.kind === 'stay').length;

  return (
    <section id="apercu" className={styles.sec} aria-labelledby="apercu-title">
      <div className={styles.wrap}>
        <Reveal className={pp.head}>
          <h2 id="apercu-title" className={pp.title}>
            {t.rich('preview.titleRich', {
              hl: (chunks) => <span className={pp.hl}>{chunks}</span>,
            })}
          </h2>
          <p className={pp.sub}>{t('preview.subtitle')}</p>
        </Reveal>
        <Reveal className={styles.previewCard}>
          <BoardingPass
            text={{
              label: t('preview.ticket'),
              passenger: t('preview.pass.passenger'),
              passengerName: t('preview.pass.passengerName'),
              date: t('preview.pass.date'),
              seat: t('preview.pass.seat'),
              flight: t('preview.pass.flight'),
              boarding: t('preview.pass.boarding'),
              gate: t('preview.pass.gate'),
              departure: t('preview.pass.departure'),
              arrival: t('preview.pass.arrival'),
              gateCloses: t('preview.pass.gateCloses'),
            }}
            from="CDG"
            to="HND"
            fromCity={plan.home}
            toCity={plan.destination}
            depTime="19:30"
            arrTime="15:25 (+1)"
            boardingTime="18:50"
            dateLabel={new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })
              .format(new Date('2027-03-10T12:00:00Z'))
              .toUpperCase()}
          />
          <p className={`${styles.ticketFacts} ${pp.centered}`}>
            {t('preview.facts', {
              hours: Math.abs(plan.shiftHours),
              days: stayDays,
            })}
          </p>
          {plan.arrival ? (
            <p className={styles.arrivalLine}>
              {t('preview.arrival', {
                body: plan.arrival.bodyClock.time,
                home: plan.home,
                local: plan.arrival.localClock.time,
                dest: plan.destination,
              })}
            </p>
          ) : null}
          <div className={pp.cards}>
            {pick.map((d, i) => {
              const essentials = d.list.filter((it) => ESSENTIAL.has(it.t));
              const more = d.list.filter((it) => !ESSENTIAL.has(it.t));
              const { title, Icon: CardIcon } = CARDS[i]!;
              return (
                <Reveal key={d.key} delay={i * 120} className={pp.card}>
                  <header className={pp.cardHead}>
                    <span className={pp.cardIcon} aria-hidden="true">
                      <CardIcon size={24} strokeWidth={2.2} />
                    </span>
                    <div>
                      <h3>{t(`preview.${title}`)}</h3>
                      <small>
                        {dayDate(d.date)}
                        {i === 2 ? ` (${plan.destination})` : ''}
                      </small>
                    </div>
                  </header>
                  <DayTimeline
                    day={legendDay(d) as unknown as PreviewDay}
                    labels={labels}
                    showList={false}
                  />
                  <ul className={pp.rows}>
                    {essentials.map((it, k) => {
                      const Icon = ICON[it.t] ?? Sun;
                      return (
                        <li key={k} data-t={it.t}>
                          <Icon size={20} aria-hidden="true" />
                          <b>
                            {it.at}
                            {it.end ? ` – ${it.end}` : ''}
                          </b>
                          <span>{labelFor(it)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {more.length ? (
                    <details className={styles.more}>
                      <summary>{t('preview.more', { n: more.length })}</summary>
                      <ul>
                        {more.map((it, k) => {
                          const Icon = ICON[it.t] ?? Sun;
                          return (
                            <li key={k}>
                              <Icon size={15} aria-hidden="true" />
                              <b>
                                {it.at}
                                {it.end ? `–${it.end}` : ''}
                              </b>
                              <span>{labelFor(it)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  ) : null}
                </Reveal>
              );
            })}
          </div>
          <div className={pp.legend}>
            <b>{t('preview.legendTitle')}</b>
            {LEGEND.map(([k, Icon]) => (
              <span key={k} data-t={k}>
                <i aria-hidden="true">
                  <Icon size={16} />
                </i>
                <span>
                  <b>{t(`preview.legend.${k}.t`)}</b>
                  <small>{t(`preview.legend.${k}.d`)}</small>
                </span>
              </span>
            ))}
          </div>
          <div className={pp.foot}>
            <p>{t('preview.note')}</p>
            <Link href="/plan" className={styles.btn}>
              {t('preview.cta')}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
