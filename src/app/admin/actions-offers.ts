'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { OFFERS } from '@/lib/access';
import { logAdmin, requireAdmin } from '@/lib/admin/access';

const schema = z.object({ id: z.uuid(), offer: z.enum(['free', ...OFFERS]) });

export type OfferResult = { ok: true } | { ok: false; error: string };

/**
 * Offre accordée manuellement (en plus des achats, qui ne sont jamais modifiés ici).
 * « free » retire l'offre manuelle ; une autre offre remplace la précédente.
 */
export async function setUserOffer(input: unknown): Promise<OfferResult> {
  const { user, db } = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Offre invalide.' };
  const { id, offer } = parsed.data;
  const target = await db.auth.admin.getUserById(id);
  const email = target.data.user?.email;
  if (!email) return { ok: false, error: 'Compte introuvable.' };

  const revoke = await db
    .from('entitlements')
    .update({ status: 'revoked' })
    .eq('user_id', id)
    .eq('source', 'manual')
    .eq('status', 'active');
  if (revoke.error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };

  if (offer !== 'free') {
    const { error } = await db.from('entitlements').insert({
      user_id: id,
      email,
      offer,
      status: 'active',
      source: 'manual',
      granted_by: user.id,
      starts_at: new Date().toISOString(),
      trip_credits: offer === 'voyage' ? 1 : 0,
    });
    if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };
  }
  await logAdmin(user.id, 'user.offer', id, { offer });
  revalidatePath('/admin/clients');
  return { ok: true };
}
