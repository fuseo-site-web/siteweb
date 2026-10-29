import { existsSync } from 'node:fs';
import { join } from 'node:path';
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
}

const lang = (l: string) => (['fr', 'en', 'es'].includes(l) ? l : 'fr');

export async function getPosts(locale: string): Promise<Post[]> {
  return (await import(`./pages/${lang(locale)}/blog.json`)).default as Post[];
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
