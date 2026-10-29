import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { cacheLife, cacheTag } from 'next/cache';
import { join } from 'node:path';
import { env } from '@/env';
import { parseMarkdown, readMinutes } from '@/lib/markdown';
import type { Block } from './pages';

export interface Post {
  id: string;
  slug: string;
  title: string;
  lead: string;
  excerpt: string;
  tag: string;
  readTime: string;
  byline: string;
  keepLabel: string;
  keep: string;
  refs: string[];
  refsTitle: string;
  blocks: Block[];
  /** Articles créés dans l'espace admin : image, SEO et date de publication. */
  cover?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
}

const lang = (l: string) => (['fr', 'en', 'es'].includes(l) ? l : 'fr');

/** Articles intégrés au site (fichiers). */
export async function getStaticPosts(locale: string): Promise<Post[]> {
  return (await import(`./pages/${lang(locale)}/blog.json`)).default as Post[];
}

const READ: Record<string, (n: number) => string> = {
  fr: (n) => `${n} min de lecture`,
  en: (n) => `${n} min read`,
  es: (n) => `${n} min de lectura`,
};
const BYLINE: Record<string, string> = { fr: 'Équipe Fuseo', en: 'Fuseo team', es: 'Equipo Fuseo' };

/** Articles publiés depuis l'espace admin (base de données), mis en cache jusqu'à la prochaine modification. */
async function getDbPosts(locale: string): Promise<Post[]> {
  'use cache';
  cacheTag('blog-posts');
  cacheLife('hours');
  try {
    const { data } = await createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false },
      },
    )
      .from('blog_posts')
      .select(
        'id, slug, title, excerpt, topic, body_md, cover_url, seo_title, seo_description, published_at',
      )
      .eq('status', 'published')
      .eq('locale', lang(locale))
      .order('published_at', { ascending: false });
    return (data ?? []).map((r) => ({
      id: `db-${r.id}`,
      slug: r.slug,
      title: r.title,
      lead: r.excerpt,
      excerpt: r.excerpt,
      tag: r.topic,
      readTime: (READ[lang(locale)] ?? READ.fr!)(readMinutes(r.body_md)),
      byline: BYLINE[lang(locale)] ?? 'Équipe Fuseo',
      keepLabel: '',
      keep: '',
      refs: [],
      refsTitle: '',
      blocks: parseMarkdown(r.body_md),
      cover: r.cover_url,
      seoTitle: r.seo_title,
      seoDescription: r.seo_description,
      publishedAt: r.published_at,
    }));
  } catch {
    return [];
  }
}

export async function getPosts(locale: string): Promise<Post[]> {
  const [db, files] = await Promise.all([getDbPosts(locale), getStaticPosts(locale)]);
  return [...db, ...files];
}

export async function getPost(locale: string, slug: string): Promise<Post | undefined> {
  return (await getPosts(locale)).find((p) => p.slug === slug);
}

/** Slug d'un même article dans une autre langue (pour hreflang). */
export async function slugIn(locale: string, id: string): Promise<string | undefined> {
  return (await getPosts(locale)).find((p) => p.id === id)?.slug;
}

/** Illustration d'un article (public/images/blog/<id>.jpg) ou null si elle n'existe pas encore. */
export const coverOf = (id: string) =>
  existsSync(join(process.cwd(), 'public', 'images', 'blog', `${id}.jpg`))
    ? `/images/blog/${id}.jpg`
    : null;

/** Image d'un article : celle téléversée dans l'admin, sinon l'illustration générée du site. */
export const coverOfPost = (p: Post) => p.cover ?? coverOf(p.id);

/** Pour le sélecteur de langue : chaque slug d'un article intégré → son slug dans chaque langue. */
export type SlugMap = Record<string, Partial<Record<'fr' | 'en' | 'es', string>>>;

export async function blogSlugMap(): Promise<SlugMap> {
  const lists = await Promise.all(
    (['fr', 'en', 'es'] as const).map(async (l) => [l, await getStaticPosts(l)] as const),
  );
  const byId = new Map<string, Partial<Record<'fr' | 'en' | 'es', string>>>();
  for (const [l, posts] of lists) {
    for (const p of posts) byId.set(p.id, { ...byId.get(p.id), [l]: p.slug });
  }
  const map: SlugMap = {};
  for (const slugs of byId.values()) for (const slug of Object.values(slugs)) map[slug] = slugs;
  return map;
}
