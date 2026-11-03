'use server';

import { cookies } from 'next/headers';
import { getRole, isViewOffer, VIEW_COOKIE } from '@/lib/access';
import { getCurrentUser } from '@/lib/auth';

/** Admin : simule une offre (gratuite ou payante) pour voir le site comme un client. `full` = retour à l'accès complet. */
export async function setViewOffer(value: string): Promise<{ ok: boolean }> {
  const { user } = await getCurrentUser();
  if (!user || (await getRole(user)) !== 'admin') return { ok: false };
  const jar = await cookies();
  if (value === 'full') {
    jar.delete(VIEW_COOKIE);
    return { ok: true };
  }
  if (!isViewOffer(value)) return { ok: false };
  jar.set(VIEW_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
  return { ok: true };
}
