'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logAdmin, requireAdmin } from '@/lib/admin/access';

const schema = z.object({
  id: z.uuid(),
  status: z.enum(['new', 'open', 'answered', 'closed']),
});

/** Change l'état d'une demande (nouvelle, en cours, répondue, clôturée). */
export async function setMessageStatus(input: unknown): Promise<{ ok: boolean }> {
  const { user, db } = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { error } = await db
    .from('contact_messages')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);
  if (error) return { ok: false };
  await logAdmin(user.id, 'message.status', parsed.data.id, { status: parsed.data.status });
  revalidatePath('/admin/demandes');
  revalidatePath('/admin/leads');
  return { ok: true };
}
