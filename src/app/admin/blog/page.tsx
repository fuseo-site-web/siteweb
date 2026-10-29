import { connection } from 'next/server';
import { FilePlus2, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { Card, PageHead } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import { getStaticPosts } from '@/content/blog';
import { getBlogPosts } from '@/lib/admin/data';

const day = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' }).format(
        new Date(iso),
      )
    : '—';

export default async function BlogAdmin() {
  // Données du jour : jamais prérendues.
  await connection();
  const [posts, files] = await Promise.all([getBlogPosts(), getStaticPosts('fr')]);
  return (
    <>
      <PageHead
        icon={Newspaper}
        title="Blog"
        lead="Rédigez, publiez et supprimez vos articles. Les images glissées dans l'éditeur sont converties en WebP et nommées pour le référencement."
      >
        <Link className={styles.btn} href="/admin/blog/nouveau">
          <FilePlus2 size={17} aria-hidden="true" /> Nouvel article
        </Link>
      </PageHead>
      <Card
        title="Mes articles"
        info="Les articles que vous créez ici. « Brouillon » : visible de vous seul. « Publié » : en ligne sur le blog et indexé par Google. Cliquez sur un titre pour le modifier."
        example="Vous écrivez un article le lundi en brouillon, le relisez, puis cliquez sur Publier le mercredi."
      >
        {posts.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Thème</th>
                  <th>Langue</th>
                  <th>État</th>
                  <th>Publié le</th>
                  <th>Modifié le</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/blog/${p.id}`}
                        style={{ fontWeight: 800, color: 'var(--ink)' }}
                      >
                        {p.title}
                      </Link>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>/blog/{p.slug}</small>
                    </td>
                    <td>{p.topic}</td>
                    <td>{p.locale.toUpperCase()}</td>
                    <td>
                      <span
                        className={`${styles.pill} ${p.status === 'published' ? styles.ok : styles.warn}`}
                      >
                        {p.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td>{day(p.published_at)}</td>
                    <td>{day(p.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <b>Aucun article créé ici pour l&apos;instant.</b>
            <Link className={styles.btn} href="/admin/blog/nouveau">
              Écrire le premier article
            </Link>
          </div>
        )}
      </Card>
      <Card
        title="Articles intégrés au site"
        hint="Ces articles sont dans le code du site (lecture seule). Ils s'affichent avec ceux que vous créez ici."
        info="Les articles d'origine, rédigés avec sources scientifiques. Pour les modifier, passez par l'équipe technique : ils ne se changent pas depuis cet espace."
        example="« Lumière et jet lag » est un article intégré."
      >
        <ul className={styles.bars}>
          {files.map((f) => (
            <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Link
                href={`/blog/${f.slug}`}
                target="_blank"
                style={{ fontWeight: 700, color: 'var(--ink)' }}
              >
                {f.title}
              </Link>
              <span className={styles.pill}>{f.tag}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
