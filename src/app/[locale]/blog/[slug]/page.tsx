import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { ArticleCard } from '@/components/blog/ArticleCard';
import styles from '@/components/blog/Blog.module.css';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { CtaBand } from '@/components/content/CtaBand';
import { PageHero } from '@/components/content/PageHero';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/seo/JsonLd';
import { coverOf, getPost, getPosts, slugIn } from '@/content/blog';
import { env } from '@/env';
import { getPathname, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { PostItem } from '@/lib/blog-search';
import { summarize } from '@/lib/seo';

type Props = PageProps<'/[locale]/blog/[slug]'>;
const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
const articleUrl = (locale: string, slug: string) =>
  base +
  getPathname({
    href: { pathname: '/blog/[slug]', params: { slug } },
    locale: locale as (typeof routing.locales)[number],
  });

export async function generateStaticParams() {
  const all = await Promise.all(
    routing.locales.map(async (locale) =>
      (await getPosts(locale)).map((p) => ({ locale, slug: p.slug })),
    ),
  );
  return all.flat();
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) return {};
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    const s = await slugIn(l, post.id);
    if (s) languages[l] = articleUrl(l, s);
  }
  const description = summarize(post.lead);
  return {
    title: post.title,
    description,
    alternates: {
      canonical: articleUrl(locale, slug),
      languages: {
        ...languages,
        'x-default': languages[routing.defaultLocale] ?? articleUrl(locale, slug),
      },
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: articleUrl(locale, slug),
      siteName: 'Fuseo',
      locale,
      ...(coverOf(post.id)
        ? { images: [{ url: base + coverOf(post.id), width: 1200, height: 675, alt: post.title }] }
        : {}),
    },
    twitter: {
      card: coverOf(post.id) ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      ...(coverOf(post.id) ? { images: [base + coverOf(post.id)] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPost(locale, slug);
  if (!post) notFound();
  const t = await getTranslations({ locale, namespace: 'blog' });
  const common = await getTranslations({ locale, namespace: 'common' });

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: summarize(post.lead),
        inLanguage: locale,
        ...(coverOf(post.id) ? { image: base + coverOf(post.id) } : {}),
        datePublished: '2026-09',
        dateModified: '2026-09',
        mainEntityOfPage: articleUrl(locale, slug),
        author: { '@type': 'Organization', name: 'Fuseo' },
        publisher: { '@type': 'Organization', name: 'Fuseo', url: base },
        citation: post.refs,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: common('home'),
            item:
              base + getPathname({ href: '/', locale: locale as (typeof routing.locales)[number] }),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('title'),
            item:
              base +
              getPathname({ href: '/blog', locale: locale as (typeof routing.locales)[number] }),
          },
          { '@type': 'ListItem', position: 3, name: post.title },
        ],
      },
    ],
  };

  const all = await getPosts(locale);
  const idx = all.findIndex((p) => p.id === post.id);
  const prev = idx > 0 ? all[idx - 1] : undefined;
  const next = idx < all.length - 1 ? all[idx + 1] : undefined;
  const asItem = (p: (typeof all)[number]): PostItem => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    tag: p.tag,
    readTime: p.readTime,
    cover: coverOf(p.id),
    haystack: '',
  });
  // « À lire aussi » : d'abord les articles d'un autre thème, jamais l'article courant.
  const more = all
    .filter((p) => p.id !== post.id)
    .slice(0, 3)
    .map(asItem);
  const cover = coverOf(post.id);
  const pages = await getTranslations({ locale, namespace: 'pages' });

  return (
    <article>
      <JsonLd data={ld} />
      <PageHero
        title={post.title}
        lead={post.lead}
        icon="news"
        eyebrow={post.tag}
        crumbs={[{ label: pages('blog'), href: '/blog' }, { label: post.title }]}
      />
      {cover ? (
        <div className={styles.cover}>
          <Image
            src={cover}
            alt=""
            width={1200}
            height={675}
            sizes="(max-width: 1000px) 100vw, 960px"
            priority
          />
        </div>
      ) : null}
      <ul className={styles.facts}>
        <li>
          <Icon name="clock" size={16} />
          {post.readTime}
        </li>
        <li>
          <Icon name="user" size={16} />
          {post.byline}
        </li>
        <li>
          <Icon name="tag" size={16} />
          {post.tag}
        </li>
      </ul>
      <ContentBlocks
        blocks={post.blocks}
        meta={{ headings: ['bulb', 'sun', 'clock', 'info', 'check'] }}
        toc
      />
      <div className={styles.article}>
        {post.keep ? (
          <div className={styles.keep}>
            <span className={styles.keepIcon}>
              <Icon name="bulb" size={22} />
            </span>
            <b>{post.keepLabel}</b>
            <p dangerouslySetInnerHTML={{ __html: post.keep }} />
          </div>
        ) : null}
        <div className={styles.refs}>
          <h2>
            <Icon name="book" size={20} />
            {post.refsTitle}
          </h2>
          <ol>
            {post.refs.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
          <p>{t('disclaimer')}</p>
        </div>
      </div>
      <CtaBand locale={locale} />
      {more.length ? (
        <section className={styles.more2} aria-labelledby="more-title">
          <h2 id="more-title">{t('related')}</h2>
          <ul className={styles.grid}>
            {more.map((p, i) => (
              <ArticleCard key={p.id} post={p} readLabel={t('read')} index={i} />
            ))}
          </ul>
          <nav className={styles.adjacent} aria-label={t('pagination')}>
            {prev ? (
              <Link href={{ pathname: '/blog/[slug]', params: { slug: prev.slug } }} rel="prev">
                <small>
                  <Icon name="chevron-left" size={14} />
                  {t('prev')}
                </small>
                <b>{prev.title}</b>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={{ pathname: '/blog/[slug]', params: { slug: next.slug } }}
                rel="next"
                className={styles.next}
              >
                <small>
                  {t('next')}
                  <Icon name="chevron-right" size={14} />
                </small>
                <b>{next.title}</b>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      ) : null}
      <RelatedLinks keys={['science', 'method', 'sources']} locale={locale} />
    </article>
  );
}
