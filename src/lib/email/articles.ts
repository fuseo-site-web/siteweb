import 'server-only';
import { getStaticPosts } from '@/content/blog';
import type { Lang } from './layout';
import type { ArticleRef, SequenceId } from './nurturing';

/** Articles (existants, relus) à glisser dans chaque séquence : jamais de texte médical écrit pour l'occasion. */
export async function articlesFor(id: SequenceId, lang: Lang): Promise<ArticleRef[]> {
  const posts = await getStaticPosts(lang);
  const pick =
    id === 'pre-trip'
      ? posts.filter((p) => p.id === 'preparer-horloge-avant-depart')
      : id === 'newsletter'
        ? posts
        : [];
  return pick.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));
}
