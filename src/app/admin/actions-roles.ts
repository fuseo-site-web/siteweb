'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { OWNER_EMAIL, ROLES } from '@/lib/access';
import { logAdmin, requireAdmin } from '@/lib/admin/access';

const schema = z.object({ id: z.uuid(), role: z.enum(ROLES) });

export type RoleResult = { ok: true } | { ok: false; error: string };

/** Change le rôle d'un compte (client, testeur, admin). Le propriétaire et son propre compte sont protégés. */
export async function setUserRole(input: unknown): Promise<RoleResult> {
  const { user, db } = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Rôle invalide.' };
  const { id, role } = parsed.data;
  if (id === user.id) return { ok: false, error: 'Vous ne pouvez pas modifier votre propre rôle.' };
  const target = await db.auth.admin.getUserById(id);
  if (!target.data.user) return { ok: false, error: 'Compte introuvable.' };
  if (target.data.user.email?.toLowerCase() === OWNER_EMAIL)
    return { ok: false, error: 'Le compte propriétaire reste administrateur.' };
  const { error } = await db
    .from('user_roles')
    .upsert({ user_id: id, role, updated_at: new Date().toISOString(), updated_by: user.id });
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };
  await logAdmin(user.id, 'user.role', id, { role });
  revalidatePath('/admin/clients');
  return { ok: true };
}
