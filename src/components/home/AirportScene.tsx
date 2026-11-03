'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import styles from './AirportScene.module.css';

const LIGHTS = [
  [240, 0],
  [288, 0.25],
  [336, 0.5],
  [384, 0.75],
  [432, 1],
  [480, 1.25],
  [528, 0],
  [576, 0.25],
  [624, 0.5],
  [672, 0.75],
  [720, 1],
  [768, 1.25],
  [816, 0],
  [864, 0.25],
  [912, 0.5],
  [960, 0.75],
  [1008, 1],
  [1056, 1.25],
  [1104, 0],
  [1152, 0.25],
];
const WINDOW_DOTS = [22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82];

/** Décor de la baie vitrée de l'aéroport : un avion roule puis décolle (animation SMIL en boucle de 9 s). */
export function AirportScene() {
  const t = useTranslations('scene');
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = svg.current;
    if (reduce && el) {
      el.pauseAnimations();
      el.setCurrentTime(3.2);
    }
  }, []);

  return (
    <div className={styles.scene} aria-hidden="true" data-testid="airport-scene">
      <svg ref={svg} viewBox="0 0 1200 230" preserveAspectRatio="xMinYMax slice" focusable="false">
        <defs>
          <linearGradient id="scene-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b2f55" />
            <stop offset=".55" stopColor="#2b3f7a" />
            <stop offset=".82" stopColor="#c77b5a" />
            <stop offset=".86" stopColor="#f3b76b" />
          </linearGradient>
        </defs>
        <rect width="1200" height="198" fill="url(#scene-dusk)" />
        <circle cx="930" cy="192" r="26" fill="#ffd58a" opacity=".85" />
        <path
          d="M0 198 L0 186 L60 186 L60 176 L110 176 L110 188 L190 188 L190 170 L230 170 L230 190 L1200 190 L1200 198Z"
          fill="#0d2442"
          opacity=".9"
        />
        <rect y="196" width="1200" height="34" fill="#0a1d33" />
        <rect x="220" y="197" width="980" height="4" fill="#1b3558" />
        {LIGHTS.map(([cx, delay]) => (
          <circle
            key={cx}
            cx={cx}
            cy="199"
            r="2.2"
            className={styles.rl}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <g>
          <g transform="translate(-50 -18)">
            <path d="M5 13 L13 13 L7 1.5 L2.5 1.5 Z" fill="#dfe8f2" />
            <path
              d="M2 18 C2 14.5 7 12.5 15 12.5 L78 12.5 C89 12.5 97 15 100 18 C97 21 89 22.5 78 22.5 L15 22.5 C7 22.5 2 21.5 2 18 Z"
              fill="#f4f8fc"
            />
            <path d="M40 19 L63 19 L51 29.5 L43 29.5 Z" fill="#c9d6e4" />
            <path d="M90 15.5 C93 15.5 96 16.5 97.5 18 L90 18 Z" fill="#0b2f55" />
            <g fill="#0b2f55">
              {WINDOW_DOTS.map((cx) => (
                <circle key={cx} cx={cx} cy="16" r="1.1" />
              ))}
            </g>
            <rect x="18" y="19.5" width="60" height="1.6" fill="#3cc0f0" />
            <circle cx="96" cy="21" r="1.4" fill="#ff5a5a" className={styles.blink} />
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              rotate="auto"
              calcMode="spline"
              keyPoints="0;0.33;1;1"
              keyTimes="0;0.38;0.86;1"
              keySplines="0.6 0 0.9 0.7;0.2 0.3 0.7 1;0 0 1 1"
              path="M 140 186 L 560 186 C 700 186 820 140 950 78 S 1180 -20 1300 -70"
            />
          </g>
        </g>
        <rect y="212" width="1200" height="18" fill="#061426" />
        <g fill="#061426">
          <circle cx="128" cy="126" r="11" />
          <path d="M116 138 Q128 131 140 138 L144 184 L112 184 Z" />
          <path d="M117 183 h10 v30 h-10z M129 183 h10 v30 h-10z" />
          <path d="M141 145 L157 170" stroke="#061426" strokeWidth="6" strokeLinecap="round" />
          <rect x="152" y="170" width="26" height="36" rx="4" />
          <rect x="163" y="156" width="4" height="15" />
          <circle cx="157" cy="209" r="3" />
          <circle cx="173" cy="209" r="3" />
        </g>
        {[300, 600, 900].map((x) => (
          <rect key={x} x={x} y="0" width="7" height="230" fill="#061426" />
        ))}
        <rect x="0" y="0" width="1200" height="7" fill="#061426" />
      </svg>
      <p className={styles.title}>{t('title')}</p>
    </div>
  );
}
