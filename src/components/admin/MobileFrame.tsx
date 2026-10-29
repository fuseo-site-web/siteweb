'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AdminNav } from './AdminNav';
import styles from './Admin.module.css';

/** Mise en page : barre latérale fixe sur ordinateur, tiroir sur mobile. */
export function MobileFrame({
  brand,
  footer,
  badges,
  children,
}: {
  brand: React.ReactNode;
  footer: React.ReactNode;
  badges: { demandes: number; leads: number };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.shell}>
      <aside className={styles.side} data-open={open}>
        {brand}
        <AdminNav badges={badges} onNavigate={() => setOpen(false)} />
        {footer}
      </aside>
      <main className={styles.main} id="contenu">
        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          Menu
        </button>
        {children}
      </main>
    </div>
  );
}
