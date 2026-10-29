'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { getPathname, Link } from '@/i18n/navigation';
import type { routing } from '@/i18n/routing';
import { filterPosts, paginate, type PostItem } from '@/lib/blog-search';
import { ArticleCard } from './ArticleCard';
import styles from './Blog.module.css';

interface Initial {
  q: string;
  tag: string;
  page: number;
}

function Browser({ posts, initial }: { posts: PostItem[]; initial: Initial }) {
  const t = useTranslations('blog');
  const locale = useLocale() as (typeof routing.locales)[number];
  const [q, setQ] = useState(initial.q);
  const [tag, setTag] = useState(initial.tag);
  const [page, setPage] = useState(initial.page);
  const top = useRef<HTMLDivElement>(null);

  const tags = [...new Set(posts.map((p) => p.tag))];
  const found = filterPosts(posts, q, tag);
  const view = paginate(found, page);

  const query = (next: Partial<Initial>) => {
    const v = { q, tag, page, ...next };
    return {
      ...(v.q.trim() ? { q: v.q.trim() } : {}),
      ...(v.tag ? { tag: v.tag } : {}),
      ...(v.page > 1 ? { page: String(v.page) } : {}),
    };
  };
  const sync = (next: Partial<Initial>) => {
    const url = getPathname({ href: { pathname: '/blog', query: query(next) }, locale });
    window.history.replaceState(null, '', url);
  };
  const update = (next: Partial<Initial>, scroll = false) => {
    if (next.q !== undefined) setQ(next.q);
    if (next.tag !== undefined) setTag(next.tag);
    setPage(next.page ?? 1);
    sync({ ...next, page: next.page ?? 1 });
    if (scroll) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showFeatured = view.page === 1 && !q.trim() && !tag && view.items.length > 1;

  return (
    <div className={styles.browser}>
      <div ref={top} className={styles.tools}>
        <form role="search" className={styles.search} onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="blog-search" className={styles.srOnly}>
            {t('search')}
          </label>
          <Icon name="search" size={20} className={styles.searchIcon} />
          <input
            id="blog-search"
            type="search"
            value={q}
            placeholder={t('searchPh')}
            autoComplete="off"
            onChange={(e) => update({ q: e.target.value })}
          />
          {q ? (
            <button
              type="button"
              className={styles.clear}
              aria-label={t('clear')}
              onClick={() => update({ q: '' })}
            >
              <Icon name="x" size={18} />
            </button>
          ) : null}
        </form>

        <div role="group" aria-label={t('topics')} className={styles.topics}>
          {['', ...tags].map((tg) => (
            <button
              key={tg || 'all'}
              type="button"
              aria-pressed={tag === tg}
              className={styles.topic}
              onClick={() => update({ tag: tg })}
            >
              {tg || t('all')}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        {t('results', { n: found.length })}
        {view.pages > 1 ? ` · ${t('pageOf', { n: view.page, total: view.pages })}` : ''}
      </p>

      {view.items.length ? (
        <ul className={styles.grid} key={`${view.page}-${q}-${tag}`}>
          {view.items.map((p, i) => (
            <ArticleCard
              key={p.id}
              post={p}
              readLabel={t('read')}
              featured={showFeatured && i === 0}
              index={i}
              priority={i < 2}
            />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <Icon name="search" size={30} />
          <p>{t('noResults', { q: q.trim() || tag })}</p>
        </div>
      )}

      {view.pages > 1 ? (
        <nav className={styles.pager} aria-label={t('pagination')}>
          {view.page > 1 ? (
            <Link
              href={{ pathname: '/blog', query: query({ page: view.page - 1 }) }}
              rel="prev"
              onClick={(e) => {
                e.preventDefault();
                update({ page: view.page - 1 }, true);
              }}
            >
              <Icon name="chevron-left" size={18} />
              {t('prev')}
            </Link>
          ) : (
            <span aria-disabled="true">
              <Icon name="chevron-left" size={18} />
              {t('prev')}
            </span>
          )}
          <ol>
            {Array.from({ length: view.pages }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <Link
                  href={{ pathname: '/blog', query: query({ page: n }) }}
                  aria-current={n === view.page ? 'page' : undefined}
                  aria-label={t('pageOf', { n, total: view.pages })}
                  onClick={(e) => {
                    e.preventDefault();
                    update({ page: n }, true);
                  }}
                >
                  {n}
                </Link>
              </li>
            ))}
          </ol>
          {view.page < view.pages ? (
            <Link
              href={{ pathname: '/blog', query: query({ page: view.page + 1 }) }}
              rel="next"
              onClick={(e) => {
                e.preventDefault();
                update({ page: view.page + 1 }, true);
              }}
            >
              {t('next')}
              <Icon name="chevron-right" size={18} />
            </Link>
          ) : (
            <span aria-disabled="true">
              {t('next')}
              <Icon name="chevron-right" size={18} />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}

const DEFAULT: Initial = { q: '', tag: '', page: 1 };

/** Lit ?q=, ?tag= et ?page= dans l'adresse ; la navigation et la recherche se font ensuite sans rechargement. */
function WithParams({ posts }: { posts: PostItem[] }) {
  const sp = useSearchParams();
  return (
    <Browser
      posts={posts}
      initial={{
        q: sp.get('q') ?? '',
        tag: sp.get('tag') ?? '',
        page: Number(sp.get('page')) || 1,
      }}
    />
  );
}

export function BlogBrowser({ posts }: { posts: PostItem[] }) {
  return <WithParams posts={posts} />;
}

/** Version sans paramètres (première page) pour le rendu statique avant lecture de l'adresse. */
export function BlogBrowserStatic({ posts }: { posts: PostItem[] }) {
  return <Browser posts={posts} initial={DEFAULT} />;
}
