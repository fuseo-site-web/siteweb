import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { billingEnabled, stripeApi } from '@/lib/billing/stripe';
import { sameOrigin } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Portail client Stripe : moyens de paiement, factures. Nécessite un premier paiement (client Stripe connu). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!billingEnabled())
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 });
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { data } = await createSupabaseAdminClient()
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'no_customer' }, { status: 404 });
  try {
    const session = await stripeApi<{ url: string }>('billing_portal/sessions', {
      customer: data.stripe_customer_id,
      return_url: `${new URL(req.url).origin}/mon-compte`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'stripe' }, { status: 502 });
  }
}
