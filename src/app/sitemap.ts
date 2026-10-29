import type { MetadataRoute } from 'next';
import { getPosts, slugIn } from '@/content/blog';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { routing, type StaticPathname as AppPathname } from '@/i18n/routing';

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
import { absoluteUrl } from '@/lib/seo';

const PAGES: AppPathname[] = [
  '/',
  '/plan',
  '/la-science',
  '/equipe',
  '/blog',
  '/tarifs',
  '/methode',
  '/sources',
  '/transparence',
  '/equipement',
  '/pro',
  '/contact',
  '/plan-du-site',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (
    await Promise.all(
      routing.locales.map(async (locale) => {
        const list = await getPosts(locale);
        return Promise.all(
          list.map(async (post) => ({
            url:
              base +
              getPathname({
                href: { pathname: '/blog/[slug]', params: { slug: post.slug } },
                locale,
              }),
            alternates: {
              languages: Object.fromEntries(
                await Promise.all(
                  routing.locales.map(async (l) => [
                    l,
                    base +
                      getPathname({
                        href: {
                          pathname: '/blog/[slug]',
                          params: { slug: (await slugIn(l, post.id)) ?? post.slug },
                        },
                        locale: l,
                      }),
                  ]),
                ),
              ),
            },
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          })),
        );
      }),
    )
  ).flat();
  const pages = PAGES.flatMap((pathname) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(pathname, locale),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(pathname, l)])),
      },
      changeFrequency: pathname === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: pathname === '/' ? 1 : 0.7,
    })),
  );
  return [...pages, ...posts];
}
