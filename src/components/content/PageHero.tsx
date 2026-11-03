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

/** En-tête de page : ciel étoilé, pastille d'icône, fil d'Ariane (avec données structurées) et appel éventuel. */
export async function PageHero({
  title,
  lead,
  icon,
  eyebrow,
  crumbs,
  children,
  visual,
}: {
  title: string;
  lead?: string;
  icon?: IconName;
  eyebrow?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
  visual?: 'airport' | 'cabin' | 'pricing';
}) {
  const locale = await getLocale();
  const common = await getTranslations({ locale, namespace: 'common' });
  const trail: Crumb[] = crumbs ? [{ label: common('home'), href: '/' }, ...crumbs] : [];

  return (
    <header className={styles.hero} data-visual={visual}>
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
