import styles from './DayTimeline.module.css';

export interface PreviewDay {
  key: string;
  date: string;
  tz: string;
  startH: number;
  lenH: number;
  segs: Array<{ t: string; a: number; b: number }>;
  marks: Array<{ t: string; a: number }>;
  list: Array<{
    t: string;
    at: string;
    end: string | null;
    n?: number;
    from?: string;
    to?: string;
  }>;
}

export type TimelineLabels = Record<string, string>;

/** Frise d'une journée (pure, sans état) : segments positionnés en pourcentage de la durée du jour. */
export function DayTimeline({
  day,
  labels,
  labelFor,
}: {
  day: PreviewDay;
  labels: TimelineLabels;
  labelFor?: (item: PreviewDay['list'][number]) => string;
}) {
  const ticks: number[] = [];
  for (let h = Math.ceil(day.startH / 6) * 6; h < day.startH + day.lenH - 0.5; h += 6)
    ticks.push(h);

  return (
    <div>
      <div
        className={`${styles.bar} ${day.segs.some((s) => s.t === 'flight') ? styles.hasFlight : ''}`}
      >
        {day.segs.map((s, i) => (
          <span
            key={i}
            className={`${styles.seg} ${styles[s.t] ?? ''}`}
            // Un vol qui commence avant cette journée « entre » par la gauche : le trait s'estompe pour le montrer.
            data-seg={s.t}
            data-cont={s.t === 'flight' && s.a < 0.005 ? 'true' : undefined}
            style={{
              left: `${s.a * 100}%`,
              width: `${Math.max((s.b - s.a) * 100, 0.8)}%`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
        {day.marks.map((m, i) => (
          <span
            key={i}
            className={`${styles.mark} ${styles[m.t] ?? ''}`}
            style={{ left: `${m.a * 100}%` }}
          />
        ))}
        {ticks.map((h) => (
          <span
            key={h}
            className={styles.tick}
            style={{ left: `${((h - day.startH) / day.lenH) * 100}%` }}
          >
            {h % 24} h
          </span>
        ))}
      </div>
      <ul className={styles.list}>
        {day.list.map((it, i) => (
          <li key={i}>
            <span className={`${styles.dot} ${styles[it.t] ?? ''}`} aria-hidden="true" />
            <b>
              {it.at}
              {it.end ? `–${it.end}` : ''}
            </b>
            <span>{labelFor ? labelFor(it) : labels[it.t]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
