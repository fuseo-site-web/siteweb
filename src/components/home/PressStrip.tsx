import Image from 'next/image';
import { useTranslations } from 'next-intl';
import styles from './Sections.module.css';

const PRESS = [
  { src: '/images/tf1.webp', alt: 'TF1', w: 259, h: 96 },
  { src: '/images/france-2.webp', alt: 'France 2', w: 486, h: 96 },
  { src: '/images/rtl.webp', alt: 'RTL', w: 146, h: 96 },
  { src: '/images/le-figaro.webp', alt: 'Le Figaro', w: 670, h: 96 },
];

export function PressStrip() {
  const t = useTranslations('press');
  return (
    <section className={styles.press} aria-labelledby="press-title">
      <h2 id="press-title">{t('title')}</h2>
      <ul>
        {PRESS.map((p) => (
          <li key={p.alt}>
            <Image src={p.src} alt={p.alt} width={p.w} height={p.h} />
          </li>
        ))}
      </ul>
    </section>
  );
}
