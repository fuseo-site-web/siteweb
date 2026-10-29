'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './Admin.module.css';

/**
 * Bulle d'aide « (i) » : explique un indicateur avec des mots simples et un exemple concret.
 * S'ouvre au clic ou au clavier, se ferme avec Échap ou en cliquant ailleurs.
 */
export function Info({
  title,
  children,
  example,
  label = 'Comprendre cet indicateur',
}: {
  title: string;
  children: React.ReactNode;
  example?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const [flip, setFlip] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  // La bulle s'ouvre vers la gauche quand le bouton est près du bord droit de l'écran.
  useLayoutEffect(() => {
    if (open && root.current)
      setFlip(root.current.getBoundingClientRect().left + 330 > window.innerWidth);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <span className={styles.info} ref={root}>
      <button
        type="button"
        className={styles.infoBtn}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label} : ${title}`}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open ? (
        <span role="note" id={id} className={styles.pop} data-flip={flip}>
          <b>{title}</b>
          <p>{children}</p>
          {example ? <span className={styles.ex}>Exemple : {example}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
