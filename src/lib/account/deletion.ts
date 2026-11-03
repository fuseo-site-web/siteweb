/** Motifs proposés lors d'une demande de suppression de compte (l'ordre est celui du formulaire). */
export const DELETION_REASONS = [
  'not_useful',
  'no_trip',
  'privacy',
  'too_many_emails',
  'other_service',
  'other',
] as const;
export type DeletionReason = (typeof DELETION_REASONS)[number];

/** Libellés pour l'équipe (espace admin, e-mail de notification). */
export const DELETION_REASON_FR: Record<DeletionReason, string> = {
  not_useful: 'Fuseo ne me sert plus',
  no_trip: 'Pas de voyage prévu',
  privacy: 'Inquiétude pour mes données',
  too_many_emails: 'Trop d’e-mails',
  other_service: 'J’utilise une autre solution',
  other: 'Autre raison',
};
