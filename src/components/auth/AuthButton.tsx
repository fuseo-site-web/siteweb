'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/** Bouton d'en-tête : lit la session côté navigateur pour que les pages marketing restent statiques. */
export function AuthButton({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn ? (
    <Link href="/compte" className={className}>
      {t('account')}
    </Link>
  ) : (
    <Link href="/connexion" className={className}>
      {t('login')}
    </Link>
  );
}
