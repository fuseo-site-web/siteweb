import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PLANE_PATH } from '@/components/brand/FuseoMark';
import { Link } from '@/i18n/navigation';
import { ClocksCard } from './ClocksCard';
import { FlightFinder } from './FlightFinder';
import styles from './Hero.module.css';

// Étoiles déterministes (pas de Math.random : rendu statique identique à chaque build).
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 100, s: 0.6 + r(3) * 1.5, d: r(4) * 5 };
});

const ARC = 'M -40 760 C 300 700, 560 520, 820 330 S 1260 40, 1500 -30';

export function Hero() {
  const t = useTranslations();

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <svg className={styles.stars} aria-hidden="true">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.s}
            fill="#fff"
            className={styles.star}
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}
      </svg>
      <svg
        className={styles.arc}
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path d={ARC} className={styles.arcPath} />
        <g className={styles.plane} style={{ offsetPath: `path("${ARC}")` }}>
          <g transform="translate(-24 -24) scale(2)">
            <path d={PLANE_PATH} fill="#fff" />
          </g>
        </g>
      </svg>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id="hero-title">{t('hero.title')}</h1>
          <p className={styles.lead}>{t('hero.lead')}</p>
          <div className={styles.buttons}>
            <Link href="/plan" className={styles.primary}>
              {t('hero.cta')}
            </Link>
            <a href="#apercu" className={styles.ghost}>
              {t('hero.example')}
            </a>
          </div>
          <ul className={styles.points}>
            <li>{t('hero.point1')}</li>
            <li>{t('hero.point2')}</li>
            <li>
              {t('hero.pointFrom')} <b>{t('hero.price')}</b>
            </li>
          </ul>
          <div className={styles.endorse}>
            <span className={styles.chip}>
              <Image
                src="/images/institut-medical-du-sommeil.png"
                alt={t('brand.logoAlt')}
                width={351}
                height={120}
              />
            </span>
            <span>{t('hero.endorse')}</span>
          </div>
        </div>
        <FlightFinder />
      </div>
      <div className={styles.below}>
        <ClocksCard />
      </div>
      <a href="#apercu" className={styles.cue} aria-label={t('hero.example')}>
        <span />
      </a>
    </section>
  );
}
