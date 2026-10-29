import { useTranslations } from 'next-intl';
import { lightPRCShape } from '@/engine/light';
import { Reveal } from '@/components/ui/Reveal';
import styles from './Sections.module.css';

const W = 640;
const H = 240;
const MID = 130;
const AMP = 96;

// Courbe de réponse de phase à la lumière, calculée par le moteur (temps biologique -12 h → +12 h autour du creux de température).
const POINTS = Array.from({ length: 97 }, (_, i) => {
  const t = -12 + i * 0.25;
  const v = lightPRCShape(t) as number;
  return { x: ((t + 12) / 24) * W, y: MID - v * AMP, t, v };
});
const LINE = POINTS.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
const AREA = `${LINE} L${W} ${MID} L0 ${MID} Z`;
const PEAK_ADV = POINTS.reduce((a, b) => (b.v > a.v ? b : a));
const PEAK_DEL = POINTS.reduce((a, b) => (b.v < a.v ? b : a));

export function Science() {
  const t = useTranslations();

  return (
    <section
      id="science"
      className={`${styles.sec} ${styles.band}`}
      aria-labelledby="science-title"
    >
      <div className={`${styles.wrap} ${styles.split}`}>
        <Reveal>
          <h2 id="science-title" className={styles.title}>
            {t('science.title')}
          </h2>
          <p className={styles.prose}>{t('science.p1')}</p>
          <p className={styles.prose}>{t('science.p2')}</p>
        </Reveal>
        <Reveal className={styles.prc} delay={120}>
          <h3>{t('science.prcTitle')}</h3>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={t('science.prcTitle')}
            className={styles.prcSvg}
          >
            <defs>
              <clipPath id="prc-up">
                <rect x="0" y="0" width={W} height={MID} />
              </clipPath>
              <clipPath id="prc-down">
                <rect x="0" y={MID} width={W} height={H - MID} />
              </clipPath>
            </defs>
            <path
              d={AREA}
              fill="var(--amber)"
              opacity="0.85"
              clipPath="url(#prc-up)"
              className={styles.draw}
            />
            <path
              d={AREA}
              fill="#8fb7e0"
              opacity="0.85"
              clipPath="url(#prc-down)"
              className={styles.draw}
            />
            <line
              x1="0"
              x2={W}
              y1={MID}
              y2={MID}
              stroke="rgb(255 255 255 / 35%)"
              strokeDasharray="4 6"
            />
            <path
              d={LINE}
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="1"
              className={styles.stroke}
            />
            <circle
              cx={PEAK_ADV.x}
              cy={PEAK_ADV.y}
              r="6"
              fill="var(--amber)"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={PEAK_DEL.x}
              cy={PEAK_DEL.y}
              r="6"
              fill="#8fb7e0"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>
          <div className={styles.legend}>
            <div>
              <i style={{ background: 'var(--amber)' }} />
              <b>{t('science.advanceLabel')}</b>
              <span>{t('science.advanceText')}</span>
            </div>
            <div>
              <i style={{ background: '#8fb7e0' }} />
              <b>{t('science.delayLabel')}</b>
              <span>{t('science.delayText')}</span>
            </div>
          </div>
          <small>{t('science.prcNote')}</small>
        </Reveal>
      </div>
    </section>
  );
}
