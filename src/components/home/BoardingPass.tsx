import { PLANE_PATH } from '@/components/brand/FuseoMark';
import styles from './BoardingPass.module.css';

export interface BoardingPassText {
  label: string;
  passenger: string;
  passengerName: string;
  date: string;
  seat: string;
  flight: string;
  boarding: string;
  gate: string;
  departure: string;
  arrival: string;
  gateCloses: string;
}

/** Code-barres décoratif, déterministe (même rendu à chaque build). */
const BARS = Array.from({ length: 34 }, (_, i) => 1 + ((i * 7 + (i % 3) * 5) % 4));

function Plane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={PLANE_PATH} fill="currentColor" transform="rotate(90 12 12)" />
    </svg>
  );
}

/** Carte d'embarquement illustrative (vol fictif) : en-tête, trajet, embarquement, talon détachable. */
export function BoardingPass({
  text,
  from,
  to,
  fromCity,
  toCity,
  depTime,
  arrTime,
  boardingTime,
  dateLabel,
}: {
  text: BoardingPassText;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  depTime: string;
  arrTime: string;
  boardingTime: string;
  dateLabel: string;
}) {
  const fields = [
    [text.passenger, text.passengerName],
    [text.date, dateLabel],
    [text.seat, '12A'],
    [text.flight, 'FU 276'],
  ] as const;

  return (
    <div
      className={styles.pass}
      role="group"
      aria-label={`${text.label} : ${fromCity} → ${toCity}, ${dateLabel}, ${text.departure} ${depTime}, ${text.arrival} ${arrTime}`}
    >
      <div className={styles.main} aria-hidden="true">
        <div className={styles.head}>
          {fields.map(([k, v]) => (
            <div key={k}>
              <small>{k}</small>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <div className={styles.body}>
          <div className={styles.barcode}>
            {BARS.map((w, i) => (
              <span key={i} style={{ width: w }} />
            ))}
          </div>
          <div className={styles.route}>
            <div>
              <b>{fromCity.toUpperCase()}</b>
              <span>
                {from} · {text.departure} {depTime}
              </span>
            </div>
            <Plane className={styles.plane} />
            <div className={styles.to}>
              <b>{toCity.toUpperCase()}</b>
              <span>
                {to} · {text.arrival} {arrTime}
              </span>
            </div>
          </div>
          <div className={styles.meta}>
            <div>
              <small>{text.gate}</small>
              <b>K42</b>
            </div>
            <div className={styles.boarding}>
              <small>{text.boarding}</small>
              <b>{boardingTime}</b>
            </div>
          </div>
          <p className={styles.closes}>{text.gateCloses}</p>
        </div>
      </div>
      <div className={styles.stub} aria-hidden="true">
        <div className={styles.stubHead}>
          <Plane className={styles.stubPlane} />
        </div>
        <dl>
          <div>
            <dt>{text.passenger}</dt>
            <dd>{text.passengerName}</dd>
          </div>
          <div>
            <dt>{text.date}</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div>
            <dt>{text.flight}</dt>
            <dd>FU 276</dd>
          </div>
          <div>
            <dt>{text.seat}</dt>
            <dd>12A</dd>
          </div>
        </dl>
        <b className={styles.stubRoute}>
          {from} <Plane className={styles.stubMini} /> {to}
        </b>
      </div>
    </div>
  );
}
