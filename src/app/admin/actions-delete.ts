'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { OWNER_EMAIL } from '@/lib/access';
import { logAdmin, requireAdmin } from '@/lib/admin/access';

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Supprime un compte et ses données. La suppression du compte d'authentification efface en cascade le profil,
 * les voyages, les données de santé (profil de sommeil, questionnaire, consentements), le rôle et le client Stripe.
 * Les demandes de contact et l'inscription à la newsletter (liées à l'adresse e-mail) sont aussi effacées.
 * Les accès achetés et les paiements sont conservés sans lien avec la personne (obligation comptable).
 */
export async function deleteClient(input: unknown): Promise<DeleteResult> {
  const { user, db } = await requireAdmin();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Compte invalide.' };
  const { id } = parsed.data;
  if (id === user.id)
    return { ok: false, error: 'Vous ne pouvez pas supprimer votre propre compte ici.' };

  const target = await db.auth.admin.getUserById(id);
  const email = target.data.user?.email?.toLowerCase();
  if (!target.data.user) return { ok: false, error: 'Compte introuvable.' };
  if (email === OWNER_EMAIL)
    return { ok: false, error: 'Le compte propriétaire ne peut pas être supprimé.' };

  if (email) {
    await db.from('contact_messages').delete().ilike('email', email);
    await db.from('newsletter_subscribers').delete().ilike('email', email);
    // Accès achetés : conservés pour la comptabilité, sans l'adresse e-mail.
    await db.from('entitlements').update({ email: 'compte-supprime' }).eq('user_id', id);
  }
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: 'Suppression impossible. Réessayez.' };
  await logAdmin(user.id, 'user.delete', id);
  revalidatePath('/admin/clients');
  return { ok: true };
}
