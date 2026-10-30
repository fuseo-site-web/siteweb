'use client';

import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import type { StaticPathname } from '@/i18n/routing';
import styles from './SiteHeader.module.css';

/** Menu des écrans étroits : les mêmes liens que la barre de navigation, dans un tiroir sous l'en-tête. */
export function MobileMenu({
  items,
  openLabel,
  closeLabel,
  menuLabel,
}: {
  items: Array<{ href: StaticPathname; label: string }>;
  openLabel: string;
  closeLabel: string;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.burger}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
      {open ? (
        <nav id="mobile-nav" className={styles.drawer} aria-label={menuLabel}>
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={path === i.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
