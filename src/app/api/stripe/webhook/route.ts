import { NextResponse } from 'next/server';
import { env } from '@/env';
import { BILLING_OFFERS, isBillingOffer } from '@/lib/billing/offers';
import { verifyStripeSignature } from '@/lib/billing/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface CheckoutSession {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  customer: string | null;
  customer_details?: { email?: string | null } | null;
  payment_intent: string | null;
  invoice: string | null;
  metadata?: { user_id?: string; offer?: string } | null;
}
interface Charge {
  payment_intent: string | null;
  refunded: boolean;
  receipt_url?: string | null;
}

/**
 * Webhook Stripe (signature vérifiée) : un paiement réussi crée le paiement et l'accès correspondant ;
 * un remboursement les révoque. Idempotent : un même événement rejoué ne crée pas de doublon.
 */
export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 });
  const payload = await req.text();
  if (
    !verifyStripeSignature(payload, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)
  )
    return NextResponse.json({ error: 'signature' }, { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: unknown } };
  const db = createSupabaseAdminClient();

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as CheckoutSession;
    const userId = s.metadata?.user_id;
    const offer = s.metadata?.offer;
    if (s.payment_status !== 'paid' || !userId || !isBillingOffer(offer))
      return NextResponse.json({ received: true });
    const already = await db
      .from('payments')
      .select('id')
      .eq('stripe_checkout_session', s.id)
      .maybeSingle();
    if (already.data) return NextResponse.json({ received: true });

    if (s.customer)
      await db
        .from('billing_customers')
        .upsert({ user_id: userId, stripe_customer_id: s.customer }, { onConflict: 'user_id' });
    const conf = BILLING_OFFERS[offer];
    const now = new Date();
    const expires = conf.months ? new Date(now) : null;
    if (expires) expires.setMonth(expires.getMonth() + conf.months!);
    const ent = await db
      .from('entitlements')
      .insert({
        user_id: userId,
        email: s.customer_details?.email ?? '',
        offer,
        status: 'active',
        source: 'stripe',
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent,
        amount_cents: s.amount_total ?? conf.amountCents,
        currency: s.currency ?? 'eur',
        starts_at: now.toISOString(),
        expires_at: expires?.toISOString() ?? null,
        trip_credits: conf.tripCredits,
      })
      .select('id')
      .single();
    await db.from('payments').insert({
      user_id: userId,
      entitlement_id: ent.data?.id ?? null,
      offer,
      amount_cents: s.amount_total ?? conf.amountCents,
      currency: s.currency ?? 'eur',
      status: 'succeeded',
      stripe_checkout_session: s.id,
      stripe_payment_intent: s.payment_intent,
    });
  }

  if (event.type === 'charge.succeeded' || event.type === 'charge.refunded') {
    const c = event.data.object as Charge;
    if (c.payment_intent) {
      const patch: { receipt_url?: string; status?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      if (c.receipt_url) patch.receipt_url = c.receipt_url;
      if (event.type === 'charge.refunded' && c.refunded) patch.status = 'refunded';
      await db.from('payments').update(patch).eq('stripe_payment_intent', c.payment_intent);
      if (patch.status === 'refunded')
        await db
          .from('entitlements')
          .update({ status: 'revoked' })
          .eq('stripe_payment_intent', c.payment_intent);
    }
  }

  return NextResponse.json({ received: true });
}
