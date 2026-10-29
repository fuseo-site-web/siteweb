'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './Content.module.css';

export interface TocItem {
  id: string;
  label: string;
}

/** Sommaire de la page : suit la section visible. Les liens sont de vrais liens vers les titres (utiles au référencement). */
export function Toc({ items }: { items: TocItem[] }) {
  const t = useTranslations('common');
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={t('toc')} className={styles.toc}>
      <p className={styles.tocTitle}>{t('toc')}</p>
      <ol>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? 'true' : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
