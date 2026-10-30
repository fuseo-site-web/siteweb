import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/blog/ArticleCard';
import blog from '@/components/blog/Blog.module.css';
import { MapEmbed } from '@/components/map/MapEmbed';
import { Reveal } from '@/components/ui/Reveal';
import { coverOfPost, getPosts } from '@/content/blog';
import { Link } from '@/i18n/navigation';
import styles from './HomeFinale.module.css';
import sections from './Sections.module.css';

const DOCTORS = [
  { key: 'taieb', name: 'Dr Jonathan Taieb', img: '/images/dr-jonathan-taieb.jpg' },
  { key: 'elbaz', name: 'Dr Maxime Elbaz', img: '/images/dr-maxime-elbaz.jpg' },
] as const;

/** Fin de la page d'accueil : derniers articles, présentation rapide de l'équipe médicale, carte et contact. */
export async function HomeFinale({ locale }: { locale: string }) {
  const [t, team, b, posts] = await Promise.all([
    getTranslations({ locale, namespace: 'home2' }),
    getTranslations({ locale, namespace: 'team' }),
    getTranslations({ locale, namespace: 'blog' }),
    getPosts(locale),
  ]);
  const latest = posts.slice(0, 3).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    tag: p.tag,
    readTime: p.readTime,
    cover: coverOfPost(p),
    haystack: '',
  }));

  return (
    <>
      <section className={sections.sec} aria-labelledby="home-articles">
        <div className={sections.wrap}>
          <Reveal>
            <h2 id="home-articles" className={sections.title}>
              {t('articlesTitle')}
            </h2>
            <p className={sections.sub}>{b('lead')}</p>
          </Reveal>
          <ul className={blog.grid}>
            {latest.map((p, i) => (
              <ArticleCard key={p.id} post={p} readLabel={b('read')} index={i} />
            ))}
          </ul>
          <Reveal>
            <Link href="/blog" className={styles.more}>
              {t('articlesAll')} →
            </Link>
          </Reveal>
        </div>
      </section>

      <section className={`${sections.sec} ${sections.band}`} aria-labelledby="home-team">
        <div className={sections.wrap}>
          <Reveal>
            <h2 id="home-team" className={sections.title}>
              {t('teamTitle')}
            </h2>
            <p className={sections.sub}>{team('lead')}</p>
          </Reveal>
          <div className={styles.doctors}>
            {DOCTORS.map((d, i) => (
              <Reveal key={d.key} delay={i * 120} className={styles.doctor}>
                <Image src={d.img} alt={d.name} width={160} height={160} />
                <div>
                  <h3>{d.name}</h3>
                  <p className={styles.role}>{team(`${d.key}.role`)}</p>
                  <p>{team(`${d.key}.b1`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className={styles.ims}>{team('ims')}</p>
            <Link href="/equipe" className={sections.btn}>
              {t('teamMeet')}
            </Link>
          </Reveal>
        </div>
      </section>

      <section className={sections.sec} aria-labelledby="home-map">
        <div className={`${sections.wrap} ${styles.findUs}`}>
          <Reveal>
            <h2 id="home-map" className={sections.title}>
              {t('mapTitle')}
            </h2>
            <p className={sections.sub}>{t('mapSub')}</p>
            <Link href="/contact" className={sections.btn}>
              {(await getTranslations({ locale, namespace: 'contact' }))('title')}
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <MapEmbed />
          </Reveal>
        </div>
      </section>
    </>
  );
}
