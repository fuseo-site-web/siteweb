import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAdminSession, logAdmin } from '@/lib/admin/access';
import { imageFileName } from '@/lib/slug';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 12 * 1024 * 1024;
const BUCKET = 'blog-images';

/**
 * Dépôt d'une image d'article : conversion en WebP (max 1600 px de large, métadonnées retirées),
 * nom de fichier adapté au référencement (titre de l'article + description), puis envoi dans le bucket public.
 */
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const title = String(form?.get('title') ?? '').slice(0, 200) || 'article';
  const alt = String(form?.get('alt') ?? '').slice(0, 120);

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'not_an_image' }, { status: 415 });
  }

  const db = createSupabaseAdminClient();
  for (let n = 1; n <= 20; n++) {
    const name = imageFileName(title, alt, n);
    const { error } = await db.storage.from(BUCKET).upload(name, webp, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (!error) {
      await logAdmin(admin.id, 'blog.upload', name, { bytes: webp.length });
      return NextResponse.json({
        url: db.storage.from(BUCKET).getPublicUrl(name).data.publicUrl,
        name,
        bytes: webp.length,
        originalBytes: file.size,
      });
    }
    // Nom déjà pris : on essaie « -2 », « -3 »…
    if (!/exists|duplicate/i.test(error.message)) {
      return NextResponse.json({ error: 'storage' }, { status: 502 });
    }
  }
  return NextResponse.json({ error: 'name_taken' }, { status: 409 });
}
