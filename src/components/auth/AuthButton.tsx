'use client';

import { UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Bouton d'en-tête : lit la session côté navigateur pour que les pages marketing restent statiques.
 * Texte sur grand écran ; sur mobile, la feuille de style masque le texte et affiche l'icône (nom accessible conservé).
 */
export function AuthButton({
  className,
  iconClassName,
  labelClassName,
}: {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const t = useTranslations('nav');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  const label = signedIn ? t('account') : t('login');
  return (
    <Link href={signedIn ? '/compte' : '/connexion'} className={className} aria-label={label}>
      <UserRound size={20} aria-hidden="true" className={iconClassName} />
      <span className={labelClassName}>{label}</span>
    </Link>
  );
}
