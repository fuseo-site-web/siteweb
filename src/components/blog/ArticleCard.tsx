import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import type { PostItem } from '@/lib/blog-search';
import styles from './Blog.module.css';

/** Carte d'article : illustration, thème, durée de lecture, titre et résumé. */
export function ArticleCard({
  post,
  readLabel,
  featured = false,
  index = 0,
  priority = false,
}: {
  post: PostItem;
  readLabel: string;
  featured?: boolean;
  index?: number;
  priority?: boolean;
}) {
  return (
    <li
      className={`${styles.card} ${featured ? styles.featured : ''}`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <Link
        href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
        className={styles.cardLink}
      >
        <span className={styles.media}>
          {post.cover ? (
            <Image
              src={post.cover}
              alt=""
              width={1200}
              height={675}
              sizes={
                featured
                  ? '(max-width: 800px) 100vw, 560px'
                  : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 330px'
              }
              priority={priority}
            />
          ) : (
            <span className={styles.placeholder}>
              <Icon name="plane" size={42} />
            </span>
          )}
          <span className={styles.tag}>{post.tag}</span>
        </span>
        <span className={styles.body}>
          <span className={styles.meta}>
            <Icon name="clock" size={15} />
            {post.readTime}
          </span>
          <h2>{post.title}</h2>
          <span className={styles.excerpt}>{post.excerpt}</span>
          <span className={styles.more}>
            {readLabel.replace(/\s*[→←]\s*$/, '')}
            <Icon name="arrow-right" size={17} />
          </span>
        </span>
      </Link>
    </li>
  );
}
