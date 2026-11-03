import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { BILLING_OFFERS, isBillingOffer } from '@/lib/billing/offers';
import { billingEnabled, stripeApi } from '@/lib/billing/stripe';
import { rateLimit, sameOrigin } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Démarre un paiement Stripe Checkout pour une offre ; renvoie l'adresse de la page de paiement. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!billingEnabled())
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 });
  if (!(await rateLimit(req, 'billing-checkout', 10, 600)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { user } = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ error: 'login' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { offer?: unknown; locale?: unknown };
  if (!isBillingOffer(body.offer))
    return NextResponse.json({ error: 'invalid_offer' }, { status: 422 });
  const offer = BILLING_OFFERS[body.offer];
  const origin = new URL(req.url).origin;
  const customer = await createSupabaseAdminClient()
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  try {
    const session = await stripeApi<{ url: string }>('checkout/sessions', {
      mode: 'payment',
      success_url: `${origin}/mon-compte?paiement=ok`,
      cancel_url: `${origin}/tarifs?paiement=annule`,
      client_reference_id: user.id,
      ...(customer.data?.stripe_customer_id
        ? { customer: customer.data.stripe_customer_id }
        : { customer_email: user.email, customer_creation: 'always' }),
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(offer.amountCents),
      'line_items[0][price_data][product_data][name]':
        body.offer === 'voyage' ? 'Fuseo · Un voyage' : 'Fuseo · Grand voyageur (12 mois)',
      'invoice_creation[enabled]': 'true',
      'metadata[user_id]': user.id,
      'metadata[offer]': body.offer,
      locale:
        typeof body.locale === 'string' && ['fr', 'en', 'es'].includes(body.locale)
          ? body.locale
          : 'auto',
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'stripe' }, { status: 502 });
  }
}
