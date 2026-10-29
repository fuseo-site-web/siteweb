/** Recherche et pagination des articles (pures, testables) : accents et casse ignorés, tous les mots doivent figurer. */
export const PAGE_SIZE = 6;

export interface PostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
  /** Image d'illustration (chemin public) ou null. */
  cover: string | null;
  /** Texte normalisé dans lequel la recherche s'effectue. */
  haystack: string;
}

export const norm = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function filterPosts(posts: PostItem[], query: string, tag: string): PostItem[] {
  const words = norm(query).split(' ').filter(Boolean);
  return posts.filter((p) => (!tag || p.tag === tag) && words.every((w) => p.haystack.includes(w)));
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    pages,
    total: items.length,
  };
}
