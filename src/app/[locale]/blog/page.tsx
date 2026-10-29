import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { BlogBrowser, BlogBrowserStatic } from '@/components/blog/BlogBrowser';
import { CtaBand } from '@/components/content/CtaBand';
import { PageHero } from '@/components/content/PageHero';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { coverOf, getPosts } from '@/content/blog';
import { norm, type PostItem } from '@/lib/blog-search';
import { pageMetadata, summarize } from '@/lib/seo';

type Props = PageProps<'/[locale]/blog'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return pageMetadata({
    locale,
    pathname: '/blog',
    title: t('title'),
    description: summarize(t('lead')),
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const pages = await getTranslations({ locale, namespace: 'pages' });
  const posts = await getPosts(locale);

  // Le texte indexé par la recherche : titre, chapô, thème, intertitres et début du corps.
  const items: PostItem[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    tag: p.tag,
    readTime: p.readTime,
    cover: coverOf(p.id),
    haystack: norm(
      [
        p.title,
        p.lead,
        p.tag,
        ...p.blocks.filter((b) => b.type === 'h').map((b) => (b.type === 'h' ? b.text : '')),
        p.blocks
          .filter((b) => b.type === 'p')
          .map((b) => (b.type === 'p' ? b.text : ''))
          .join(' ')
          .slice(0, 1500),
      ].join(' '),
    ),
  }));

  return (
    <>
      <PageHero
        title={t('title')}
        lead={t('lead')}
        icon="news"
        eyebrow={pages('sectionsMain')}
        crumbs={[{ label: pages('blog') }]}
      />
      <Suspense fallback={<BlogBrowserStatic posts={items} />}>
        <BlogBrowser posts={items} />
      </Suspense>
      <CtaBand locale={locale} />
      <RelatedLinks keys={['science', 'method', 'team']} locale={locale} />
    </>
  );
}
