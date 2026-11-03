/** Offres payantes : prix (centimes, TTC) et durée d'accès. Source unique pour Stripe et l'affichage. */
export const BILLING_OFFERS = {
  voyage: { amountCents: 890, tripCredits: 1, months: null },
  annuel: { amountCents: 7990, tripCredits: 0, months: 12 },
} as const;
export type BillingOffer = keyof typeof BILLING_OFFERS;
export const isBillingOffer = (v: unknown): v is BillingOffer =>
  typeof v === 'string' && v in BILLING_OFFERS;
