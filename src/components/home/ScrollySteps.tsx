'use client';

import { useEffect, useRef, useState } from 'react';
import { PLANE_PATH } from '@/components/brand/FuseoMark';
import { DayTimeline, type PreviewDay, type TimelineLabels } from './DayTimeline';
import styles from './ScrollySteps.module.css';

export interface StepsText {
  title: string;
  note: string;
  bed: string;
  wake: string;
  paris: string;
  tokyo: string;
  steps: Array<{ title: string; text: string }>;
}

const ROUTE = 'M 40 190 C 140 190, 190 60, 360 40';

/** Scrollytelling : trois étapes à gauche, une scène fixe à droite qui change avec le défilement. */
export function ScrollySteps({
  text,
  day,
  labels,
}: {
  text: StepsText;
  day: PreviewDay;
  labels: TimelineLabels;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.scrolly} data-step={active}>
      <div className={styles.stageWrap}>
        <div className={styles.stage} aria-hidden="true">
          <div className={`${styles.panel} ${styles.p0}`}>
            <svg viewBox="0 0 24 24" className={styles.moon}>
              <path fill="currentColor" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
            </svg>
            <div className={styles.field}>
              <span>{text.bed}</span>
              <b>23:00</b>
            </div>
            <div className={styles.field}>
              <span>{text.wake}</span>
              <b>07:00</b>
            </div>
            <div className={styles.sleepBar}>
              <i style={{ left: 0, width: '29.17%' }} />
              <i style={{ left: '95.83%', width: '4.17%' }} />
            </div>
          </div>

          <div className={`${styles.panel} ${styles.p1}`}>
            <svg viewBox="0 0 400 230" className={styles.route}>
              <path d={ROUTE} className={styles.routePath} />
              <circle cx="40" cy="190" r="7" fill="#ffc857" />
              <circle cx="360" cy="40" r="7" fill="#3cc0f0" />
              <g className={styles.routePlane} style={{ offsetPath: `path("${ROUTE}")` }}>
                <g transform="translate(-12 -12)">
                  <path d={PLANE_PATH} fill="#fff" />
                </g>
              </g>
              <text x="40" y="216" className={styles.city}>
                {text.paris}
              </text>
              <text x="360" y="22" textAnchor="end" className={styles.city}>
                {text.tokyo}
              </text>
            </svg>
          </div>

          <div className={`${styles.panel} ${styles.p2}`}>
            <div className={styles.light}>
              <DayTimeline day={day} labels={labels} />
            </div>
          </div>
        </div>
      </div>

      <ol className={styles.steps}>
        {text.steps.map((s, i) => (
          <li
            key={s.title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={active === i ? styles.on : undefined}
          >
            <span className={styles.num}>{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
