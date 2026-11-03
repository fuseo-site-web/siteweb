'use client';

import { Check, Plane, Search } from 'lucide-react';
import styles from './HowItWorks.module.css';

export interface FlightSearchText {
  placeholder: string;
  departures: string;
  /** Destinations du tableau, la 3e est celle du vol recherché. */
  cities: string[];
  paris: string;
  tokyo: string;
}

const FLIGHT = 'FU 276';
const ROWS = [
  ['FU 104', '18:05'],
  ['FU 233', '18:40'],
  ['FU 276', '19:30'],
  ['FU 318', '19:55'],
] as const;
/** Découpage de la démo selon l'avancement du défilement (0 → 1). */
const TYPE_START = 0.06;
const BOARD_START = 0.34;
const FOUND_START = 0.56;
const ROUTE_START = 0.76;

/**
 * Démo de l'étape 2, pilotée par le défilement : un champ vide (curseur qui clignote), la saisie du numéro de vol,
 * un tableau des départs façon panneau à lamelles où le bon vol se sélectionne, puis le trajet CDG → HND.
 * Elle avance et recule avec la molette ; sans animation (préférence système), `progress` vaut 1 : le trajet.
 */
export function FlightSearchDemo({ progress, text }: { progress: number; text: FlightSearchText }) {
  const phase =
    progress >= ROUTE_START
      ? 'route'
      : progress >= FOUND_START
        ? 'found'
        : progress >= BOARD_START
          ? 'board'
          : 'typing';
  const typed = Math.min(
    FLIGHT.length,
    Math.max(
      0,
      Math.ceil(((progress - TYPE_START) / (BOARD_START - 0.04 - TYPE_START)) * FLIGHT.length),
    ),
  );

  if (phase === 'route')
    return (
      <div className={`${styles.routeVis} ${styles.routeIn}`}>
        <b>CDG</b>
        <svg viewBox="0 0 160 50" preserveAspectRatio="none" className={styles.line}>
          <path d="M6 42 C50 42 70 6 154 10" className={styles.arc} />
        </svg>
        <Plane size={18} className={styles.plane} />
        <b>HND</b>
        <small>
          {FLIGHT} · {text.paris} → {text.tokyo}
        </small>
      </div>
    );

  if (phase === 'board' || phase === 'found')
    return (
      <div className={styles.board}>
        <span className={styles.boardHead}>
          <Plane size={13} /> {text.departures}
        </span>
        <ul>
          {ROWS.map(([code, time], r) => {
            const city = (r === 2 ? text.tokyo : (text.cities[r] ?? '')).toUpperCase();
            const hit = phase === 'found' && r === 2;
            return (
              <li
                key={code}
                data-hit={hit || undefined}
                data-dim={(phase === 'found' && !hit) || undefined}
              >
                {[code, city, time].map((cell, c) => (
                  <span key={c} className={styles.cell}>
                    {[...cell].map((ch, k) => (
                      <i key={k} style={{ animationDelay: `${(r * 3 + k) * 25}ms` }}>
                        {ch === ' ' ? ' ' : ch}
                      </i>
                    ))}
                  </span>
                ))}
                {hit ? <Check size={14} className={styles.hitIcon} /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div className={styles.search}>
      <Search size={16} />
      <span className={styles.searchText}>
        {typed ? FLIGHT.slice(0, typed) : <em>{text.placeholder}</em>}
        <span className={styles.caret} />
      </span>
    </div>
  );
}
