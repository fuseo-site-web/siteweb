'use client';

import { useTranslations } from 'next-intl';
import { useConsent } from './ConsentProvider';

/** Lien permanent du pied de page : rouvre le choix, aussi simple à retirer qu'à donner. */
export function ManageCookies({ className }: { className?: string }) {
  const t = useTranslations('consent');
  const { reopen } = useConsent();
  return (
    <button type="button" className={className} onClick={reopen}>
      {t('manage')}
    </button>
  );
}
