import { useId } from 'react';

/** Logo Fuseo (repris du prototype) : lune, horizon, trait ciel et avion. */
export function FuseoMark({ size = 38 }: { size?: number }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="24" cy="24" r="18" />
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d5d9b" />
          <stop offset="1" stopColor="#0e3b69" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}c)`}>
        <circle cx="31" cy="31" r="4.4" fill="#fff1c9" />
        <path d="M4 33.6C12 29.6 18 35.6 26 32.6S40 28.6 46 31.6V46H4z" fill="#ffc857" />
      </g>
      <path d="M17.5 12.5a6 6 0 1 0 5.2 9.2 5 5 0 1 1-5.2-9.2z" fill="#fff" />
      <circle cx="28" cy="13" r="1" fill="#fff" />
      <circle cx="33" cy="18" r=".8" fill="#fff" opacity=".8" />
      <path
        d="M5.5 35.5C14 45 34 44.5 41.2 21"
        fill="none"
        stroke="#3cc0f0"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <g transform="translate(42.6 15.2) rotate(17) scale(.5) translate(-12 -12)">
        <path
          fill="#3cc0f0"
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </g>
    </svg>
  );
}

export const PLANE_PATH =
  'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';
