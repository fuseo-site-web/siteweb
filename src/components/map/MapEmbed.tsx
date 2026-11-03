'use client';

import { MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useConsent } from '@/components/consent/ConsentProvider';
import styles from './Map.module.css';

// Les deux sites de l'Institut : Google Maps retrouve le lieu à partir de l'adresse.
const SITES = [
  { key: 'Paris', address: '77 avenue Paul Doumer, 75016 Paris' },
  { key: 'Neuilly', address: '130B avenue Charles de Gaulle, 92200 Neuilly-sur-Seine' },
] as const;

const embed = (address: string, locale: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&hl=${locale}&output=embed`;

/**
 * Carte Google Maps des deux sites de l'Institut. Elle s'affiche d'elle-même dès que le visiteur a accepté les cookies ;
 * sinon (refus ou pas encore de choix), elle attend un clic : Google ne reçoit aucune donnée sans accord.
 */
export function MapEmbed() {
  const t = useTranslations('home2');
  const locale = useLocale();
  const { consent } = useConsent();
  const [site, setSite] = useState<(typeof SITES)[number]['key']>('Paris');
  const [shown, setShown] = useState(false);
  const cur = SITES.find((s) => s.key === site)!;
  const visible = shown || consent?.analytics === true;

  return (
    <div className={styles.map}>
      <div className={styles.tabs} role="tablist" aria-label={t('mapTitle')}>
        {SITES.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={site === s.key}
            className={styles.tab}
            onClick={() => setSite(s.key)}
          >
            <MapPin size={15} aria-hidden="true" /> {t(`map${s.key}`)}
          </button>
        ))}
      </div>
      <p className={styles.addr}>{t(`addr${site}`)}</p>

      <div className={styles.frame}>
        {visible ? (
          <iframe
            title={`${t('mapTitle')} : ${t(`map${site}`)}`}
            src={embed(cur.address, locale)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={styles.placeholder}>
            <svg
              viewBox="0 0 600 340"
              role="img"
              aria-label={t('mapAlt')}
              preserveAspectRatio="xMidYMid slice"
            >
              <rect width="600" height="340" fill="#dfeaf4" />
              <path
                d="M-20 250 C 120 200, 220 290, 340 230 S 560 120, 640 160"
                fill="none"
                stroke="#9fd5ee"
                strokeWidth="34"
                strokeLinecap="round"
              />
              {[60, 150, 240, 330, 420, 510].map((x) => (
                <path key={x} d={`M${x} -10 L${x + 40} 350`} stroke="#fff" strokeWidth="9" />
              ))}
              {[50, 120, 190, 260, 300].map((y) => (
                <path key={y} d={`M-10 ${y} L610 ${y + 22}`} stroke="#fff" strokeWidth="7" />
              ))}
              <circle cx="300" cy="150" r="46" fill="#3cc0f0" opacity=".18" />
              <path
                d="M300 178c-22-26-30-40-30-56a30 30 0 0 1 60 0c0 16-8 30-30 56z"
                fill="#0b2f55"
              />
              <circle cx="300" cy="122" r="11" fill="#ffc857" />
            </svg>
            <div className={styles.cover}>
              <button type="button" className={styles.show} onClick={() => setShown(true)}>
                {t('mapShow')}
              </button>
              <small>{t('mapPrivacy')}</small>
            </div>
          </div>
        )}
      </div>

      <a
        className={styles.dir}
        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cur.address)}`}
        target="_blank"
        rel="noopener"
      >
        {t('mapDirections')} →
      </a>
    </div>
  );
}
