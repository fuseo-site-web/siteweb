import { connection } from 'next/server';
import { Newspaper } from 'lucide-react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BlogEditor, type EditorPost } from '@/components/admin/BlogEditor';
import { PageHead } from '@/components/admin/parts';
import { getStaticPosts } from '@/content/blog';
import { getBlogPost } from '@/lib/admin/data';

const EMPTY: EditorPost = {
  id: null,
  title: '',
  slug: '',
  locale: 'fr',
  excerpt: '',
  topic: 'Conseils',
  bodyMd: '',
  coverUrl: null,
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
  status: 'draft',
};

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  // Données du jour : jamais prérendues.
  await connection();
  const { id } = await params;
  let initial = EMPTY;
  if (id !== 'nouveau') {
    if (!z.uuid().safeParse(id).success) notFound();
    const row = await getBlogPost(id);
    if (!row) notFound();
    initial = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      locale: row.locale as EditorPost['locale'],
      excerpt: row.excerpt,
      topic: row.topic,
      bodyMd: row.body_md,
      coverUrl: row.cover_url,
      coverAlt: row.cover_alt,
      seoTitle: row.seo_title ?? '',
      seoDescription: row.seo_description ?? '',
      status: row.status as EditorPost['status'],
    };
  }
  const topics = [...new Set((await getStaticPosts('fr')).map((p) => p.tag))];
  return (
    <>
      <PageHead
        icon={Newspaper}
        title={initial.id ? "Modifier l'article" : 'Nouvel article'}
        lead="Écrivez, ajoutez des images par glisser-déposer, puis publiez. Un brouillon n'est visible que de vous."
      />
      <BlogEditor initial={initial} topics={topics} />
    </>
  );
}
