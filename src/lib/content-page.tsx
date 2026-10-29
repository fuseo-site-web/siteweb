import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { CtaBand } from '@/components/content/CtaBand';
import { PageHero } from '@/components/content/PageHero';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { getPage, LEGAL_PAGES, type PageName } from '@/content/pages';
import { PAGE_META } from '@/content/page-meta';
import type { StaticPathname as AppPathname } from '@/i18n/routing';
import { pageMetadata, summarize } from '@/lib/seo';

type Params = Promise<{ locale: string }>;

export async function contentMetadata(
  params: Params,
  name: PageName,
  pathname: AppPathname,
  noindex = false,
) {
  const { locale } = await params;
  const page = await getPage(locale, name);
  const firstText = page.lead || page.blocks.find((b) => b.type === 'p')?.text || page.title;
  return pageMetadata({
    locale,
    pathname,
    title: page.title,
    description: summarize(firstText),
    noindex,
  });
}

const GROUP: Partial<Record<PageName, 'sectionsTrust' | 'sectionsLegal' | 'sectionsMain'>> = {
  sources: 'sectionsTrust',
  transparency: 'sectionsTrust',
  mentions: 'sectionsLegal',
  cgv: 'sectionsLegal',
  privacy: 'sectionsLegal',
  cgu: 'sectionsLegal',
  cookies: 'sectionsLegal',
  accessibility: 'sectionsLegal',
};

export async function ContentPage({ params, name }: { params: Params; name: PageName }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPage(locale, name);
  const meta = PAGE_META[name];
  const pages = await getTranslations({ locale, namespace: 'pages' });
  const legal = LEGAL_PAGES.includes(name);
  const notice =
    legal && locale !== 'fr'
      ? (await getTranslations({ locale, namespace: 'legal' }))('notice')
      : '';
  return (
    <div lang={legal ? 'fr' : undefined}>
      <PageHero
        title={page.title}
        lead={notice ? `${page.lead} ${notice}` : page.lead}
        icon={meta.icon}
        eyebrow={pages(GROUP[name] ?? 'sectionsMain')}
        crumbs={[{ label: pages(name === 'transparency' ? 'transparency' : name) }]}
      />
      <ContentBlocks blocks={page.blocks} meta={meta} toc={meta.toc} />
      {meta.cta ? <CtaBand locale={locale} /> : null}
      <RelatedLinks keys={meta.related} locale={locale} />
    </div>
  );
}
