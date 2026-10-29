import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Utilisateur validé par le serveur Auth (jamais getSession seul pour une décision d'accès). */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export const HEALTH_POLICY_VERSION = '2026-10-27';
