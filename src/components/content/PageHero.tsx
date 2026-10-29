import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import type { StaticPathname } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';
import styles from './Hero.module.css';

export interface Crumb {
  label: string;
  href?: StaticPathname;
}

const STARS = [
  [8, 22, 0],
  [18, 64, 1.2],
  [27, 14, 0.6],
  [41, 52, 2.1],
  [57, 18, 1.6],
  [66, 70, 0.3],
  [74, 30, 2.6],
  [84, 12, 0.9],
  [91, 58, 1.9],
  [96, 28, 0.4],
  [34, 78, 2.3],
  [49, 8, 1.4],
] as const;

/** En-tête de page : ciel étoilé animé, pastille d'icône, fil d'Ariane (avec données structurées) et appel éventuel. */
export async function PageHero({
  title,
  lead,
  icon,
  eyebrow,
  crumbs,
  children,
}: {
  title: string;
  lead?: string;
  icon?: IconName;
  eyebrow?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  const locale = await getLocale();
  const common = await getTranslations({ locale, namespace: 'common' });
  const trail: Crumb[] = crumbs ? [{ label: common('home'), href: '/' }, ...crumbs] : [];

  return (
    <header className={styles.hero}>
      {trail.length ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: trail.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.label,
              ...(c.href ? { item: absoluteUrl(c.href, locale) } : {}),
            })),
          }}
        />
      ) : null}

      <div className={styles.sky} aria-hidden="true">
        {STARS.map(([x, y, d], i) => (
          <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
        ))}
        <svg className={styles.route} viewBox="0 0 600 240" preserveAspectRatio="xMaxYMid meet">
          <path id="hero-route" d="M10 220 C 150 40, 360 10, 590 110" />
          <g className={styles.plane}>
            <g transform="translate(-11 -11) rotate(90 11 11)">
              <path
                fill="currentColor"
                transform="scale(.92)"
                d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
              />
            </g>
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              rotate="auto"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#hero-route" />
            </animateMotion>
          </g>
        </svg>
      </div>

      <div className={styles.inner}>
        {trail.length ? (
          <nav aria-label={common('breadcrumb')} className={styles.crumbs}>
            <ol>
              {trail.map((c, i) => (
                <li key={i}>
                  {c.href && i < trail.length - 1 ? (
                    <Link href={c.href}>{c.label}</Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className={styles.row}>
          {icon ? (
            <span className={styles.badge} aria-hidden="true">
              <Icon name={icon} size={30} />
            </span>
          ) : null}
          <div className={styles.text}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h1>{title}</h1>
            {lead ? <p className={styles.lead}>{lead}</p> : null}
            {children ? <div className={styles.actions}>{children}</div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
