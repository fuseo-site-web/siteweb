import { getPosts } from '@/content/blog';
import { getPage, type PageName } from '@/content/pages';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { routing, type StaticPathname } from '@/i18n/routing';
import { blocksToMarkdown, htmlToMd } from '@/lib/content-text';
import { getTranslations } from 'next-intl/server';

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
type Locale = (typeof routing.locales)[number];

const PAGES: Array<[StaticPathname, PageName]> = [
  ['/la-science', 'science'],
  ['/methode', 'method'],
  ['/sources', 'sources'],
  ['/transparence', 'transparency'],
  ['/equipement', 'gear'],
  ['/pro', 'pro'],
];

/**
 * /llms-full.txt : le texte complet du site en Markdown, pour qu'un assistant IA le lise d'un trait.
 * Français par défaut ; ?lang=en ou ?lang=es pour les autres langues.
 */
export async function GET(req: Request) {
  const asked = new URL(req.url).searchParams.get('lang');
  const locale: Locale = routing.locales.find((l) => l === asked) ?? routing.defaultLocale;
  const url = (p: StaticPathname) => base + getPathname({ href: p, locale });

  const t = await getTranslations({ locale, namespace: 'team' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const parts: string[] = [
    `# Fuseo : texte complet (${locale})`,
    `> ${meta('description')}`,
    `Source : ${base}. Le service donne des informations générales sur le sommeil et la chronobiologie du voyage ; il ne remplace pas l'avis d'un professionnel de santé.`,
  ];

  for (const [path, name] of PAGES) {
    const page = await getPage(locale, name);
    parts.push(
      `---\n\n## ${htmlToMd(page.title)}\n\nAdresse : ${url(path)}`,
      page.lead ? htmlToMd(page.lead) : '',
      blocksToMarkdown(page.blocks, base),
    );
  }

  parts.push(
    `---\n\n## ${t('title')}\n\nAdresse : ${url('/equipe')}`,
    t('lead'),
    `- **Dr Jonathan Taieb** : ${t('taieb.role')}`,
    `- **Dr Maxime Elbaz** : ${t('elbaz.role')}`,
  );

  for (const post of await getPosts(locale)) {
    const path = getPathname({
      href: { pathname: '/blog/[slug]', params: { slug: post.slug } },
      locale,
    });
    parts.push(
      `---\n\n## ${htmlToMd(post.title)}\n\nAdresse : ${base}${path}\nThème : ${post.tag} · ${post.readTime}`,
      htmlToMd(post.lead),
      blocksToMarkdown(post.blocks, base),
      post.keep ? `**${post.keepLabel}** ${htmlToMd(post.keep, base)}` : '',
      post.refs.length
        ? `Références :\n${post.refs.map((r, i) => `${i + 1}. ${htmlToMd(r, base)}`).join('\n')}`
        : '',
    );
  }

  return new Response(parts.filter(Boolean).join('\n\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
