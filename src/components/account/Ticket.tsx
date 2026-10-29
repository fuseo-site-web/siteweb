import type { CSSProperties } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { TicketView } from '@/lib/trip-view';
import { TicketActions } from './TicketActions';
import styles from './Ticket.module.css';

const FUSEO = { bg: '#0b2f55', fg: '#ffffff', accent: '#3cc0f0', accentFg: '#0b2240' };

/** Billet de voyage façon carte d'embarquement, aux couleurs de la compagnie (ou de Fuseo sans numéro de vol). */
export async function Ticket({ ticket, locale }: { ticket: TicketView; locale: string }) {
  const t = await getTranslations({ locale, namespace: 'account' });
  const format = await getFormatter({ locale });
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso.slice(0, 10)}T12:00:00Z`), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const time = (iso: string) => iso.slice(11, 16);

  const colors = ticket.airline ?? FUSEO;
  const shift = Math.abs(ticket.shiftHours);
  const status =
    ticket.status === 'past'
      ? t('done')
      : ticket.status === 'ongoing'
        ? t('ongoing')
        : t('countdown', { n: ticket.daysUntil });
  const style = {
    '--t-bg': colors.bg,
    '--t-fg': colors.fg,
    '--t-accent': colors.accent,
    '--t-accent-fg': colors.accentFg,
  } as CSSProperties;

  return (
    <article className={`${styles.ticket} ${styles[ticket.status]}`} style={style}>
      <div className={styles.main}>
        <header className={styles.head}>
          <span className={styles.mono} aria-hidden="true">
            {ticket.airline?.code ?? 'FU'}
          </span>
          <span className={styles.airline}>{ticket.airline?.name ?? t('ticketNoFlight')}</span>
          {ticket.flight ? <span className={styles.flight}>{ticket.flight}</span> : null}
          <span className={styles.status}>{status}</span>
        </header>

        <div className={styles.route}>
          <div className={styles.end}>
            <b className={styles.iata}>{ticket.from.code}</b>
            <span className={styles.city}>{ticket.from.city}</span>
            <span className={styles.when}>
              {day(ticket.departLocal)} · {time(ticket.departLocal)}
            </span>
          </div>
          <div className={styles.path} aria-hidden="true">
            <i />
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                transform="rotate(90 12 12)"
              />
            </svg>
            <i />
          </div>
          <div className={`${styles.end} ${styles.endRight}`}>
            <b className={styles.iata}>{ticket.to.code}</b>
            <span className={styles.city}>{ticket.to.city}</span>
            <span className={styles.when}>
              {day(ticket.arriveLocal)} · {time(ticket.arriveLocal)}
            </span>
          </div>
        </div>

        <footer className={styles.meta}>
          <span className={styles.chip}>
            {shift < 0.5
              ? t('ticketNoShift')
              : t('ticketShift', {
                  h: `${ticket.shiftHours > 0 ? '+' : '−'}${shift.toLocaleString(locale)}`,
                })}
          </span>
          <span className={styles.chip}>{t('ticketStops', { n: ticket.stops })}</span>
          {ticket.returnLeg ? (
            <span className={styles.chip}>
              {t('ticketReturn', { date: day(ticket.returnLeg.departLocal) })}
            </span>
          ) : null}
        </footer>
      </div>

      <div className={styles.stub}>
        <div className={styles.barcode} aria-hidden="true" />
        <span className={styles.ref}>{ticket.ref}</span>
        <TicketActions id={ticket.id} />
      </div>
    </article>
  );
}
