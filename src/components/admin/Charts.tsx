'use client';

import { useId, useState } from 'react';
import styles from './Admin.module.css';

export interface Series {
  name: string;
  color: string;
  values: number[];
}

const W = 760;
const H = 250;
const PAD = { l: 38, r: 10, t: 12, b: 26 };

const nice = (max: number) => {
  if (max <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

/**
 * Courbes (ou aires empilées) par jour, avec infobulle au survol et alternative textuelle.
 * Rendu en SVG, sans bibliothèque externe.
 */
export function LineChart({
  labels,
  series,
  stacked = false,
  caption,
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  caption: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const max = nice(Math.max(1, ...(stacked ? totals : series.flatMap((s) => s.values))));
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const every = Math.max(1, Math.ceil(n / 8));

  // Séries cumulées pour les aires empilées.
  const base = labels.map(() => 0);
  const layers = series.map((s) => {
    const lower = [...base];
    const upper = s.values.map((v, i) => (stacked ? base[i]! + v : v));
    if (stacked) upper.forEach((u, i) => (base[i] = u));
    return { s, lower, upper };
  });

  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const area = (lo: number[], up: number[]) =>
    `${path(up)}${[...lo]
      .reverse()
      .map((v, k) => `L${x(n - 1 - k)},${y(v)}`)
      .join('')}Z`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(
      Math.min(n - 1, Math.max(0, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)))),
    );
  };

  return (
    <figure className={styles.chart} style={{ margin: 0 }}>
      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={caption}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <g className={styles.gridLines}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
                <text className={styles.axis} x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
                  {fmt(t)}
                </text>
              </g>
            ))}
          </g>
          {labels.map((l, i) =>
            i % every === 0 ? (
              <text key={l} className={styles.axis} x={x(i)} y={H - 6} textAnchor="middle">
                {l}
              </text>
            ) : null,
          )}
          {layers.map(({ s, lower, upper }, k) => (
            <g key={s.name}>
              {stacked || series.length === 1 ? (
                <>
                  <defs>
                    <linearGradient id={`${uid}${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={s.color} stopOpacity={stacked ? 0.85 : 0.3} />
                      <stop offset="1" stopColor={s.color} stopOpacity={stacked ? 0.55 : 0.02} />
                    </linearGradient>
                  </defs>
                  <path d={area(lower, upper)} fill={`url(#${uid}${k})`} />
                </>
              ) : null}
              <path
                d={path(upper)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
              {n <= 31
                ? upper.map((v, i) => (
                    <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 2.6} fill={s.color} />
                  ))
                : null}
            </g>
          ))}
          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="var(--muted)"
              strokeDasharray="3 4"
            />
          ) : null}
        </svg>
        {hover !== null ? (
          <div
            className={styles.tip}
            style={{ left: `${(x(hover) / W) * 100}%`, top: 24 }}
            aria-hidden="true"
          >
            <b>{labels[hover]}</b>
            {series.map((s) => (
              <span key={s.name}>
                <span>
                  <i style={{ background: s.color }} /> {s.name}
                </span>
                <b>{fmt(s.values[hover] ?? 0)}</b>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.sr}>
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Jour</th>
              {series.map((s) => (
                <th key={s.name}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l}>
                <td>{l}</td>
                {series.map((s) => (
                  <td key={s.name}>{s.values[i] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Mini-courbe d'une carte d'indicateur. */
export function Sparkline({ values, color = 'var(--sky)' }: { values: number[]; color?: string }) {
  const uid = useId();
  const w = 200;
  const h = 38;
  const max = Math.max(1, ...values);
  const pts = values.map(
    (v, i) =>
      [
        values.length <= 1 ? 0 : (i * w) / (values.length - 1),
        h - 3 - (v / max) * (h - 8),
      ] as const,
  );
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={styles.spark}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length ? <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${uid})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
