'use client';

import { MessageCircleMore, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { useConsent } from '@/components/consent/ConsentProvider';
import { Link } from '@/i18n/navigation';
import styles from './ContactFab.module.css';

// Le formulaire ne se charge qu'à la première ouverture : aucun poids ajouté au chargement des pages.
const ContactForm = dynamic(() => import('./ContactForm').then((m) => m.ContactForm), {
  ssr: false,
  loading: () => <div className={styles.loading} aria-busy="true" />,
});

/** Bouton rond de contact, en bas à droite de toutes les pages, qui ouvre un formulaire aux couleurs de Fuseo. */
export function ContactFab() {
  const t = useTranslations('fab');
  const { open: consentOpen } = useConsent();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
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
      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-modal="false"
          aria-labelledby="fab-title"
          tabIndex={-1}
          className={styles.panel}
        >
          <header className={styles.head}>
            <FuseoMark size={34} />
            <div>
              <h2 id="fab-title">{t('title')}</h2>
              <p>{t('sub')}</p>
            </div>
            <button
              type="button"
              className={styles.close}
              aria-label={t('close')}
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className={styles.body}>
            <ContactForm compact />
            <Link href="/contact" className={styles.page} onClick={() => setOpen(false)}>
              {t('page')} →
            </Link>
          </div>
        </div>
      ) : null}
      <button
        ref={button}
        type="button"
        className={styles.fab}
        data-open={open}
        data-consent={consentOpen}
        aria-expanded={open}
        aria-label={open ? t('close') : t('open')}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X size={26} aria-hidden="true" />
        ) : (
          <MessageCircleMore size={28} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
