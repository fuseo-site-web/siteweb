import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Info } from './Info';
import { Sparkline } from './Charts';
import styles from './Admin.module.css';

export const nf = new Intl.NumberFormat('fr-FR');

/** Barres horizontales classées (sources, pages, clics…). */
export function BarList({
  items,
  unit = '',
  empty = 'Pas encore de données sur cette période.',
  color,
  of,
}: {
  items: Array<{ label: string; value: number; sub?: string; color?: string }>;
  /** Total de référence pour les pourcentages (par défaut : somme des lignes). */
  of?: number;
  unit?: string;
  empty?: string;
  color?: string;
}) {
  if (!items.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = of || items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className={styles.bars}>
      {items.map((i) => (
        <li key={i.label + (i.sub ?? '')}>
          <div className={styles.barTop}>
            <span title={i.label}>
              {i.label}
              {i.sub ? (
                <small style={{ color: 'var(--muted)', fontWeight: 500 }}> · {i.sub}</small>
              ) : null}
            </span>
            <em>
              {nf.format(i.value)}
              {unit} · {Math.round((i.value / total) * 100)} %
            </em>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${(i.value / max) * 100}%`, ['--c' as string]: i.color ?? color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Carte d'indicateur : valeur, évolution par rapport à la période précédente, mini-courbe et aide (i). */
export function Kpi({
  icon: Icon,
  label,
  value,
  previous,
  spark,
  info,
  example,
  chip,
  suffix = '',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  previous?: number;
  spark?: number[];
  info: React.ReactNode;
  example: string;
  chip?: { fg: string; bg: string };
  suffix?: string;
}) {
  const delta =
    previous === undefined
      ? null
      : previous === 0
        ? value > 0
          ? 100
          : 0
        : Math.round(((value - previous) / previous) * 100);
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiHead}>
        <span
          className={styles.chip}
          style={
            chip
              ? ({
                  ['--chip-fg' as string]: chip.fg,
                  ['--chip-bg' as string]: chip.bg,
                } as React.CSSProperties)
              : undefined
          }
        >
          <Icon size={17} aria-hidden="true" />
        </span>
        {label}
        <Info title={label} example={example}>
          {info}
        </Info>
      </div>
      <div className={styles.big}>
        {nf.format(value)}
        {suffix}
      </div>
      {delta !== null ? (
        <div className={styles.deltaRow}>
          <span
            className={`${styles.delta} ${delta > 0 ? styles.up : delta < 0 ? styles.down : styles.flat}`}
          >
            {delta > 0 ? (
              <ArrowUpRight size={14} />
            ) : delta < 0 ? (
              <ArrowDownRight size={14} />
            ) : (
              <Minus size={14} />
            )}
            {delta > 0 ? '+' : ''}
            {delta} %
          </span>
          <small>vs période précédente</small>
        </div>
      ) : null}
      {spark ? <Sparkline values={spark} /> : null}
    </div>
  );
}

export function PageHead({
  icon: Icon,
  title,
  lead,
  children,
}: {
  icon: LucideIcon;
  title: string;
  lead: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.top}>
      <div>
        <h1>
          <span className={styles.chip} style={{ width: 40, height: 40, borderRadius: 12 }}>
            <Icon size={22} aria-hidden="true" />
          </span>
          {title}
        </h1>
        <p>{lead}</p>
      </div>
      {children}
    </header>
  );
}

export function Period({ base, current }: { base: string; current: 7 | 30 | 90 }) {
  return (
    <nav className={styles.period} aria-label="Période affichée">
      {([7, 30, 90] as const).map((d) => (
        <Link key={d} href={`${base}?p=${d}`} aria-current={d === current} scroll={false}>
          {d} jours
        </Link>
      ))}
    </nav>
  );
}

export function Card({
  title,
  icon: Icon,
  hint,
  info,
  example,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  info?: React.ReactNode;
  example?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <h2>
        {Icon ? (
          <Icon size={18} aria-hidden="true" style={{ color: 'var(--accent-text)' }} />
        ) : null}
        {title}
        {info ? (
          <Info title={title} example={example}>
            {info}
          </Info>
        ) : null}
      </h2>
      {hint ? (
        <p
          className="hint"
          style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--muted)' }}
        >
          {hint}
        </p>
      ) : null}
      {children}
    </section>
  );
}
