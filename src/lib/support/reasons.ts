/** Motifs de contact du support (l'ordre est celui du formulaire). */
export const SUPPORT_REASONS = [
  'plan',
  'account',
  'payment',
  'technical',
  'health',
  'other',
] as const;
export type SupportReason = (typeof SUPPORT_REASONS)[number];

/** Libellés pour l'espace admin et les e-mails à l'équipe (français). */
export const REASON_FR: Record<SupportReason, string> = {
  plan: 'Question sur mon plan',
  account: 'Mon compte ou la connexion',
  payment: 'Paiement ou offre',
  technical: 'Problème technique',
  health: 'Question sur le sommeil ou la santé',
  other: 'Autre demande',
};

/** Numéro de dossier lisible au téléphone (sans 0/O ni 1/I) : SUP-7KQ4ZD. */
export function newSupportRef(random: (n: number) => Uint8Array): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `SUP-${[...random(6)].map((b) => alphabet[b % alphabet.length]).join('')}`;
}
