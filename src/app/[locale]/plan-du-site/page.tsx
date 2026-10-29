import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHero } from '@/components/content/PageHero';
import styles from '@/components/content/Content.module.css';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { RELATED_TARGET, type RelatedKey } from '@/content/page-meta';
import { Link } from '@/i18n/navigation';
import type { StaticPathname as AppPathname } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';

type Props = PageProps<'/[locale]/plan-du-site'>;

const GROUP_ICON: Record<string, IconName> = {
  sectionsMain: 'plane',
  sectionsTrust: 'shield',
  sectionsLegal: 'scale',
};
const ITEM_ICON = (label: string): IconName =>
  label === 'home' ? 'globe' : (RELATED_TARGET[label as RelatedKey]?.icon ?? 'file');

const GROUPS: Array<{ title: string; items: Array<{ href: AppPathname; label: string }> }> = [
  {
    title: 'sectionsMain',
    items: [
      { href: '/', label: 'home' },
      { href: '/plan', label: 'plan' },
      { href: '/la-science', label: 'science' },
      { href: '/equipe', label: 'team' },
      { href: '/blog', label: 'blog' },
      { href: '/tarifs', label: 'pricing' },
      { href: '/methode', label: 'method' },
      { href: '/pro', label: 'pro' },
      { href: '/equipement', label: 'gear' },
    ],
  },
  {
    title: 'sectionsTrust',
    items: [
      { href: '/sources', label: 'sources' },
      { href: '/transparence', label: 'transparency' },
    ],
  },
  {
    title: 'sectionsLegal',
    items: [
      { href: '/mentions-legales', label: 'mentions' },
      { href: '/cgv', label: 'cgv' },
      { href: '/cgu', label: 'cgu' },
      { href: '/cookies', label: 'cookies' },
      { href: '/accessibilite', label: 'accessibility' },
      { href: '/confidentialite', label: 'privacy' },
    ],
  },
];

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages' });
  return pageMetadata({
    locale,
    pathname: '/plan-du-site',
    title: t('sitemap'),
    description: t('sitemapLead'),
  });
}

export default async function SiteMapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pages' });
  const common = await getTranslations({ locale, namespace: 'common' });

  return (
    <>
      <PageHero
        title={t('sitemap')}
        lead={t('sitemapLead')}
        icon="map"
        eyebrow={t('sectionsMain')}
        crumbs={[{ label: t('sitemap') }]}
      />
      <div className={styles.siteGrid}>
        {GROUPS.map((g, gi) => (
          <Reveal as="section" key={g.title} delay={gi * 90} className={styles.siteGroup}>
            <h2>
              <span className={styles.h2icon}>
                <Icon name={GROUP_ICON[g.title] ?? 'file'} size={22} />
              </span>
              {t(g.title)}
            </h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href}>
                    <Icon name={ITEM_ICON(i.label)} size={18} />
                    {i.label === 'home' ? common('home') : t(i.label)}
                    <Icon name="arrow-right" size={16} className={styles.siteArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </>
  );
}
