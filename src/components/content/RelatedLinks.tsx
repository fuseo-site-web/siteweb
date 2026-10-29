import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { getPage, type PageName } from '@/content/pages';
import { RELATED_TARGET, type RelatedKey } from '@/content/page-meta';
import { Link } from '@/i18n/navigation';
import { summarize } from '@/lib/seo';
import styles from './Content.module.css';

const CONTENT_PAGES: Partial<Record<RelatedKey, PageName>> = {
  science: 'science',
  method: 'method',
  sources: 'sources',
  transparency: 'transparency',
  gear: 'gear',
  pro: 'pro',
  mentions: 'mentions',
  cgv: 'cgv',
  cgu: 'cgu',
  privacy: 'privacy',
  cookies: 'cookies',
  accessibility: 'accessibility',
};

async function blurb(locale: string, key: RelatedKey): Promise<string> {
  const name = CONTENT_PAGES[key];
  if (name) {
    const page = await getPage(locale, name);
    const text = page.lead || page.blocks.find((b) => b.type === 'p')?.text || '';
    return summarize(text, 125);
  }
  const by: Record<string, [string, string]> = {
    team: ['team', 'lead'],
    blog: ['blog', 'lead'],
    pricing: ['pricing', 'sub'],
    sitemap: ['pages', 'sitemapLead'],
    plan: ['planner', 'lead'],
  };
  const [ns, k] = by[key]!;
  return summarize((await getTranslations({ locale, namespace: ns }))(k), 125);
}

/** « Pour aller plus loin » : cartes vers des pages liées du site (maillage interne). Textes repris des pages cibles. */
export async function RelatedLinks({ keys, locale }: { keys: RelatedKey[]; locale: string }) {
  const common = await getTranslations({ locale, namespace: 'common' });
  const pages = await getTranslations({ locale, namespace: 'pages' });
  const items = await Promise.all(
    keys.map(async (k) => ({
      key: k,
      title: pages(k),
      text: await blurb(locale, k),
      ...RELATED_TARGET[k],
    })),
  );
  return (
    <section className={styles.related} aria-labelledby="related-title">
      <h2 id="related-title">{common('related')}</h2>
      <ul>
        {items.map((it, i) => (
          <Reveal as="li" key={it.key} delay={i * 90}>
            <Link href={it.href} className={styles.relCard}>
              <span className={styles.relIcon}>
                <Icon name={it.icon} size={22} />
              </span>
              <span className={styles.relTitle}>{it.title}</span>
              <span className={styles.relText}>{it.text}</span>
              <span className={styles.relGo}>
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
