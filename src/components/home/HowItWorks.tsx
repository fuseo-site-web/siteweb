'use client';

import {
  BedDouble,
  BookOpenCheck,
  CalendarCheck,
  CalendarPlus,
  Clock3,
  Coffee,
  Globe2,
  Stethoscope,
  Timer,
  Dumbbell,
  Moon,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Sun,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FlightSearchDemo, type FlightSearchText } from './FlightSearchDemo';
import styles from './HowItWorks.module.css';

export interface HowText {
  title: string;
  note: string;
  bed: string;
  wake: string;
  paris: string;
  tokyo: string;
  eyebrow: string;
  /** Étape 2 : démo de recherche de vol. */
  search: FlightSearchText;
  /** Garanties affichées sous les étapes. */
  benefits: string[];
  /** Étape 3 : le plan avant, pendant et après le vol. */
  phases: Array<{ title: string; items: Array<{ icon: string; text: string; short: string }> }>;
  steps: Array<{ title: string; text: string }>;
}

const ICONS = [BedDouble, Plane, CalendarCheck];
/** Seuils de défilement (0 → 1) : étape 1, puis étape 2 (avec sa démo), puis étape 3. */
const STEP2_START = 0.2;
const STEP3_START = 0.74;
const BENEFIT_ICONS: LucideIcon[] = [Timer, BookOpenCheck, Stethoscope, CalendarPlus];
/** Décor : icônes de voyage et de sommeil, très discrètes, qui flottent autour des étapes. */
const DECOR: Array<[LucideIcon, number, number, number, number]> = [
  // icône, gauche (%), haut (%), taille (px), délai (s)
  [Moon, 6, 14, 46, 0],
  [Sun, 90, 12, 52, 1.2],
  [Plane, 80, 70, 44, 0.6],
  [Coffee, 4, 72, 40, 2],
  [Clock3, 14, 40, 34, 1.6],
  [Globe2, 94, 44, 40, 0.3],
  [Utensils, 70, 90, 32, 2.4],
  [BedDouble, 24, 88, 36, 1],
];
const PHASE_ICONS: LucideIcon[] = [PlaneTakeoff, Plane, PlaneLanding];
const ITEM_ICONS: Record<string, LucideIcon> = {
  light: Sun,
  coffee: Coffee,
  sport: Dumbbell,
  sleep: Moon,
  meal: Utensils,
  alcohol: Wine,
};

/**
 * « Comment fonctionne Fuseo ? » : trois étapes côte à côte. La section reste à l'écran pendant le défilement ;
 * une ligne de progression relie les étapes, qui s'allument l'une après l'autre (scrollytelling).
 * Sans animation (préférence système) : tout est affiché d'emblée.
 */
export function HowItWorks({ text }: { text: HowText }) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      setP(run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const apply = () => {
      setStill(reduce.matches);
      if (reduce.matches) {
        window.removeEventListener('scroll', onScroll);
        setP(1);
      } else {
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
      }
    };
    apply();
    reduce.addEventListener('change', apply);
    window.addEventListener('resize', onScroll);
    return () => {
      reduce.removeEventListener('change', apply);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /** Avancement de la démo « Votre voyage » (0 → 1) pendant l'étape 2. */
  const tripProgress = Math.min(1, Math.max(0, (p - STEP2_START) / (STEP3_START - STEP2_START)));
  // La ligne atteint l'étape 2 quand elle s'allume, puis l'étape 3 au moment où celle-ci s'allume.
  const railFill = p < STEP2_START ? (0.5 * p) / STEP2_START : 0.5 + 0.5 * tripProgress;

  const visual = (i: number) => (
    <div className={styles.visual} aria-hidden="true">
      {i === 0 ? (
        <div className={styles.sleepVis}>
          <span>
            <Moon size={16} /> {text.bed} <b>23:00</b>
          </span>
          <span>
            <Sun size={16} /> {text.wake} <b>07:00</b>
          </span>
        </div>
      ) : i === 1 ? (
        <FlightSearchDemo progress={still ? 1 : tripProgress} text={text.search} />
      ) : (
        <div className={styles.phases}>
          {text.phases.map((ph, k) => {
            const PhaseIcon = PHASE_ICONS[k]!;
            return (
              <div key={ph.title} className={styles.phase}>
                <span className={styles.phaseTitle}>
                  <PhaseIcon size={14} /> {ph.title}
                </span>
                <ul className={styles.planVis}>
                  {ph.items.map((it, j) => {
                    const Icon = ITEM_ICONS[it.icon] ?? Sun;
                    return (
                      <li
                        key={it.text}
                        style={{ '--d': `${(k * 3 + j) * 90}ms` } as React.CSSProperties}
                      >
                        <Icon size={14} />
                        <span title={it.text}>{it.short}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Étape active : 0 → 1 → 2 au fil du défilement (la dernière reste allumée).
  // Étape 2 plus longue : sa démo (saisie, panneau des départs, trajet) avance avec le défilement.
  const active = still ? 2 : p < STEP2_START ? 0 : p < STEP3_START ? 1 : 2;

  return (
    <div
      ref={ref}
      className={styles.track}
      data-still={still || undefined}
      style={{ '--p': still ? 1 : railFill } as React.CSSProperties}
    >
      <div className={styles.stage}>
        <div className={styles.decor} aria-hidden="true">
          {DECOR.map(([Icon, x, y, size, delay], i) => (
            <Icon
              key={i}
              size={size}
              strokeWidth={1.6}
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
            />
          ))}
        </div>
        <span className={styles.eyebrow}>
          <Clock3 size={15} aria-hidden="true" /> {text.eyebrow}
        </span>
        <h2 id="steps-title" className={styles.title}>
          {text.title}
        </h2>
        <p className={styles.note}>{text.note}</p>
        <div className={styles.row}>
          <span className={styles.rail} aria-hidden="true">
            <span className={styles.fill} />
          </span>
          <ol className={styles.steps}>
            {text.steps.map((s, i) => {
              const Icon = ICONS[i]!;
              const on = i <= active;
              return (
                <li
                  key={s.title}
                  className={styles.step}
                  data-on={on || undefined}
                  data-current={i === active || undefined}
                >
                  <span className={styles.badge} aria-hidden="true">
                    <Icon size={26} strokeWidth={2.2} />
                    <b>{i + 1}</b>
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {visual(i)}
                </li>
              );
            })}
          </ol>
        </div>
        {/* Mobile : le texte et le visuel de l'étape active, sous la rangée d'icônes. */}
        <div className={styles.detail} aria-hidden="true">
          <p>{text.steps[active]!.text}</p>
          {visual(active)}
        </div>
        <ul className={styles.benefits}>
          {text.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i] ?? Timer;
            return (
              <li key={b}>
                <Icon size={18} aria-hidden="true" />
                {b}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
