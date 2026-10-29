'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { logAdmin, requireAdmin } from '@/lib/admin/access';

const BUCKET = 'blog-images';

const postSchema = z.object({
  id: z.uuid().nullable(),
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  locale: z.enum(['fr', 'en', 'es']),
  excerpt: z.string().trim().max(400),
  topic: z.string().trim().min(1).max(60),
  bodyMd: z.string().max(60000),
  coverUrl: z.string().max(500).nullable(),
  coverAlt: z.string().trim().max(200),
  seoTitle: z.string().trim().max(120).nullable(),
  seoDescription: z.string().trim().max(200).nullable(),
  status: z.enum(['draft', 'published']),
});

export type SaveResult =
  { ok: true; id: string } | { ok: false; error: 'invalid' | 'slug_taken' | 'failed' };

const refresh = () => {
  updateTag('blog-posts');
  revalidatePath('/blog');
  revalidatePath('/admin/blog');
};

/** Crée ou met à jour un article. La publication met le blog public à jour immédiatement. */
export async function savePost(input: unknown): Promise<SaveResult> {
  const { user, db } = await requireAdmin();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const v = parsed.data;
  const row = {
    title: v.title,
    slug: v.slug,
    locale: v.locale,
    excerpt: v.excerpt,
    topic: v.topic,
    body_md: v.bodyMd,
    cover_url: v.coverUrl,
    cover_alt: v.coverAlt,
    seo_title: v.seoTitle || null,
    seo_description: v.seoDescription || null,
    status: v.status,
    updated_at: new Date().toISOString(),
  };

  if (v.id) {
    const { data: before } = await db
      .from('blog_posts')
      .select('published_at')
      .eq('id', v.id)
      .maybeSingle();
    const published_at =
      v.status === 'published'
        ? (before?.published_at ?? new Date().toISOString())
        : (before?.published_at ?? null);
    const { error } = await db
      .from('blog_posts')
      .update({ ...row, published_at })
      .eq('id', v.id);
    if (error) return { ok: false, error: error.code === '23505' ? 'slug_taken' : 'failed' };
    await logAdmin(user.id, 'blog.update', v.slug, { status: v.status });
    refresh();
    return { ok: true, id: v.id };
  }
  const { data, error } = await db
    .from('blog_posts')
    .insert({ ...row, published_at: v.status === 'published' ? new Date().toISOString() : null })
    .select('id')
    .single();
  if (error || !data)
    return { ok: false, error: error?.code === '23505' ? 'slug_taken' : 'failed' };
  await logAdmin(user.id, 'blog.create', v.slug, { status: v.status });
  refresh();
  return { ok: true, id: data.id };
}

/** Supprime l'article et les images du stockage qui lui sont rattachées. */
export async function deletePost(id: string): Promise<{ ok: boolean }> {
  const { user, db } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { data: post } = await db
    .from('blog_posts')
    .select('slug, cover_url, body_md')
    .eq('id', id)
    .maybeSingle();
  if (!post) return { ok: false };
  const files = new Set<string>();
  const re = new RegExp(`/storage/v1/object/public/${BUCKET}/([^)\\s"']+)`, 'g');
  for (const text of [post.cover_url ?? '', post.body_md]) {
    for (const m of text.matchAll(re)) files.add(decodeURIComponent(m[1]!));
  }
  const { error } = await db.from('blog_posts').delete().eq('id', id);
  if (error) return { ok: false };
  if (files.size) await db.storage.from(BUCKET).remove([...files]);
  await logAdmin(user.id, 'blog.delete', post.slug, { images: files.size });
  refresh();
  return { ok: true };
}
