import 'server-only';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Rôle d'un compte :
 * - client : accès selon son forfait (gratuit = premiers jours du plan, payant = plan complet) ;
 * - tester : pilote, plan complet sans payer, pas d'espace admin ;
 * - admin : plan complet + espace administrateur (toujours protégé par le code d'ouverture).
 */
export const ROLES = ['client', 'tester', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Compte propriétaire : toujours administrateur, son rôle ne peut pas être modifié depuis l'admin. */
export const OWNER_EMAIL = 'contact.fuseo@gmail.com';

export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);

/** Offres payantes (table `entitlements`) et simulation d'offre réservée aux admins. */
export const OFFERS = ['voyage', 'annuel', 'ami', 'pro'] as const;
export const VIEW_OFFERS = ['free', ...OFFERS] as const;
export type ViewOffer = (typeof VIEW_OFFERS)[number];
export const VIEW_COOKIE = 'fuseo_view_offer';
export const isViewOffer = (v: unknown): v is ViewOffer => VIEW_OFFERS.includes(v as ViewOffer);

/** Offre simulée par un admin (« voir le site comme… ») ; null = accès complet normal. Ignorée pour les autres rôles. */
export async function getViewOffer(role: Role | null): Promise<ViewOffer | null> {
  if (role !== 'admin') return null;
  const v = (await cookies()).get(VIEW_COOKIE)?.value;
  return isViewOffer(v) ? v : null;
}

type UserLike = { id: string; email?: string | null; email_confirmed_at?: string | null };

/** Rôle lu côté serveur (clé service role) ; aucune ligne = client. */
export async function getRole(user: UserLike): Promise<Role> {
  if (user.email_confirmed_at && user.email?.toLowerCase() === OWNER_EMAIL) return 'admin';
  try {
    const { data } = await createSupabaseAdminClient()
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    return isRole(data?.role) ? data.role : 'client';
  } catch {
    return 'client';
  }
}

/** Le visiteur a-t-il droit au plan complet ? Testeur, admin, ou forfait payant actif. */
export async function getPlanAccess(): Promise<{
  role: Role | null;
  full: boolean;
  viewAs: ViewOffer | null;
}> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { role: null, full: false, viewAs: null };
  const role = await getRole(user);
  // Un admin peut voir le plan comme une offre donnée : gratuit = jours limités, autre offre = plan complet.
  const viewAs = await getViewOffer(role);
  if (viewAs) return { role, full: viewAs !== 'free', viewAs };
  if (role !== 'client') return { role, full: true, viewAs: null };
  const { data } = await supabase
    .from('entitlements')
    .select('id')
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1);
  return { role, full: !!data?.length, viewAs: null };
}
