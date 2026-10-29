'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Dashboard.module.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/** Onglets accessibles (flèches, Début/Fin) ; tous les panneaux sont rendus côté serveur, un seul est visible. */
export function Tabs({
  tabs,
  label,
  variant = 'main',
  initial,
}: {
  tabs: TabItem[];
  label: string;
  variant?: 'main' | 'segmented';
  initial?: string;
}) {
  const uid = useId();
  const [active, setActive] = useState(
    initial && tabs.some((t) => t.id === initial) ? initial : tabs[0]!.id,
  );
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(tabs[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className={variant === 'main' ? styles.tabs : styles.segmented}
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className={variant === 'main' ? styles.tab : styles.seg}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {t.count !== undefined ? <span className={styles.count}>{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={active !== t.id}
          className={styles.panel}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
