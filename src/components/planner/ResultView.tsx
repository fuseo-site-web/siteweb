'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { DayTimeline, type PreviewDay } from '@/components/home/DayTimeline';
import { Link } from '@/i18n/navigation';
import { makePlanLabels, type Translate } from '@/lib/plan-labels';
import type { PlanResponse } from '@/lib/plan-view';
import styles from './Planner.module.css';

export function ResultView({ plan, onEdit }: { plan: PlanResponse; onEdit: () => void }) {
  const t = useTranslations('planner');
  const pricing = useTranslations('pricing');
  const format = useFormatter();
  const locale = useLocale();

  const shift = Math.abs(plan.shiftHours);
  const { labels, labelFor, strategyLabel, dayTag } = makePlanLabels(t as unknown as Translate);
  const stratLabel = strategyLabel(plan.strategy);
  const tag = dayTag;

  return (
    <div className={styles.result}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <h2>
            {plan.home} <span aria-hidden="true">✈</span> {plan.destination}
          </h2>
          <button type="button" className={styles.ghost} onClick={onEdit}>
            {t('edit')}
          </button>
        </div>
        <p className={styles.heroLine}>
          {shift < 0.5
            ? t('noShift')
            : `${t('shiftLine', { hours: shift.toLocaleString(locale), direction: plan.shiftHours > 0 ? t('shiftEast') : t('shiftWest') })} · ${stratLabel} · ${plan.direction === 'ADVANCE' ? t('advance') : t('delay')}`}
        </p>
        {plan.arrival ? (
          <dl className={styles.dash}>
            <div>
              <dt>{t('bodyClock')}</dt>
              <dd>{plan.arrival.bodyClock.time}</dd>
              <small>{plan.arrival.bodyClock.city}</small>
            </div>
            <div>
              <dt>{t('localTime')}</dt>
              <dd>{plan.arrival.localClock.time}</dd>
              <small>{plan.arrival.localClock.city}</small>
            </div>
            <div>
              <dt>{t('residual')}</dt>
              <dd>{plan.arrival.estimatedResidualJetLag.label}</dd>
            </div>
            <div>
              <dt>{t('adaptation')}</dt>
              <dd>{plan.arrival.adaptation} %</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <section className={styles.rules} aria-label={t('rules')}>
        <h3>{t('rules')}</h3>
        <ol>
          <li>{t('rule1')}</li>
          <li>{t('rule2')}</li>
          <li>{t('rule3')}</li>
          <li>{t('rule4')}</li>
        </ol>
      </section>

      <div className={styles.days}>
        {plan.days.map((d) => (
          <article
            key={d.key}
            className={`${styles.day} ${d.kind === 'flight' ? styles.flightDay : ''}`}
          >
            <header>
              <h3>
                {format.dateTime(new Date(`${d.date}T12:00:00Z`), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  timeZone: 'UTC',
                })}
              </h3>
              {tag(d.kind) ? <span className={styles.tag}>{tag(d.kind)}</span> : null}
            </header>
            {d.noon ? (
              <p className={styles.noon}>
                {t('bodyClock')} <b>{d.noon.bodyClock.time}</b> · {t('localTime')}{' '}
                <b>{d.noon.localClock.time}</b> · {t('adaptation')} <b>{d.noon.adaptation} %</b>
                {d.noon.alertness != null ? (
                  <>
                    {' '}
                    · {t('alertness')} <b>{d.noon.alertness}</b>/100
                  </>
                ) : null}
              </p>
            ) : null}
            <DayTimeline day={d as unknown as PreviewDay} labels={labels} labelFor={labelFor} />
          </article>
        ))}
      </div>

      {plan.lockedDays > 0 ? (
        <section className={styles.locked}>
          <h3>{t('lockedTitle', { n: plan.lockedDays })}</h3>
          <p>{t('lockedText')}</p>
          <Link href="/tarifs" className={styles.cta}>
            {t('lockedCta')}
          </Link>
          <small>{pricing('soon')}</small>
        </section>
      ) : null}
      <p className={styles.disclaimer}>{t('disclaimer')}</p>
    </div>
  );
}
