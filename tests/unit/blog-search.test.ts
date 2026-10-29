import { describe, expect, it } from 'vitest';
import { filterPosts, norm, paginate, type PostItem } from '@/lib/blog-search';

const post = (i: number, title: string, tag = 'Lumière', extra = ''): PostItem => ({
  id: `p${i}`,
  slug: `p-${i}`,
  title,
  excerpt: '',
  tag,
  readTime: '4 min',
  cover: null,
  haystack: norm(`${title} ${tag} ${extra}`),
});

describe('recherche d’articles', () => {
  const posts = [
    post(1, 'La lumière, premier levier', 'Lumière'),
    post(2, 'Mélatonine et jet lag', 'Mélatonine'),
    post(3, 'Bien dormir en avion', 'En vol', 'casque bouchons'),
  ];
  it('ignore accents et casse', () => {
    expect(filterPosts(posts, 'MELATONINE', '').map((p) => p.id)).toEqual(['p2']);
    expect(filterPosts(posts, 'lumiere', '').map((p) => p.id)).toEqual(['p1']);
  });
  it('exige tous les mots, dans n’importe quel ordre', () => {
    expect(filterPosts(posts, 'avion dormir', '').map((p) => p.id)).toEqual(['p3']);
    expect(filterPosts(posts, 'avion lumiere', '')).toEqual([]);
  });
  it('cherche aussi dans le corps indexé et combine thème et mots', () => {
    expect(filterPosts(posts, 'casque', '').map((p) => p.id)).toEqual(['p3']);
    expect(filterPosts(posts, 'jet', 'Mélatonine').map((p) => p.id)).toEqual(['p2']);
    expect(filterPosts(posts, 'jet', 'En vol')).toEqual([]);
  });
  it('requête vide : tout, sans thème', () => {
    expect(filterPosts(posts, '  ', '')).toHaveLength(3);
  });
});

describe('pagination (6 par page)', () => {
  const many = Array.from({ length: 14 }, (_, i) => i + 1);
  it('découpe en pages de 6', () => {
    expect(paginate(many, 1).items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(paginate(many, 3)).toMatchObject({ items: [13, 14], page: 3, pages: 3, total: 14 });
  });
  it('borne la page demandée', () => {
    expect(paginate(many, 99).page).toBe(3);
    expect(paginate(many, 0).page).toBe(1);
    expect(paginate(many, Number.NaN).page).toBe(1);
  });
  it('6 articles ou moins : une seule page', () => {
    expect(paginate([1, 2, 3, 4, 5, 6], 1).pages).toBe(1);
    expect(paginate([], 1)).toMatchObject({ pages: 1, items: [] });
  });
});
