'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './Map.module.css';

const SITES = [
  { key: 'Paris', lat: 48.8593, lon: 2.2778 },
  { key: 'Neuilly', lat: 48.883, lon: 2.2663 },
] as const;

const embed = (lat: number, lon: number) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.012},${lat - 0.006},${lon + 0.012},${lat + 0.006}&layer=mapnik&marker=${lat},${lon}`;

/**
 * Carte des deux sites de l'Institut. La vraie carte (OpenStreetMap, service tiers) ne se charge qu'après un clic :
 * aucune donnée n'est transmise avant que le visiteur le décide.
 */
export function MapEmbed() {
  const t = useTranslations('home2');
  const [site, setSite] = useState<(typeof SITES)[number]['key']>('Paris');
  const [shown, setShown] = useState(false);
  const cur = SITES.find((s) => s.key === site)!;

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
        {shown ? (
          <iframe
            title={`${t('mapTitle')} : ${t(`map${site}`)}`}
            src={embed(cur.lat, cur.lon)}
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
        href={`https://www.google.com/maps/dir/?api=1&destination=${cur.lat},${cur.lon}`}
        target="_blank"
        rel="noopener"
      >
        {t('mapDirections')} →
      </a>
    </div>
  );
}
