'use client';

import { CreditCard, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './Account.module.css';

/** Boutons de paiement (Stripe Checkout) et accès au portail client. Désactivés tant que Stripe n'est pas branché. */
export function BillingActions({
  enabled,
  hasCustomer,
  prices,
  mode,
}: {
  enabled: boolean;
  hasCustomer: boolean;
  prices: { voyage: string; annuel: string };
  mode: 'buy' | 'portal';
}) {
  const t = useTranslations('account');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function go(path: string, body: Record<string, string> = {}) {
    setBusy(true);
    setError(false);
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, locale }),
      });
      const j = (await r.json()) as { url?: string };
      if (!r.ok || !j.url) throw new Error();
      window.location.assign(j.url);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        {mode === 'buy' ? (
          <>
            <button
              type="button"
              className={styles.primary}
              disabled={!enabled || busy}
              onClick={() => void go('/api/billing/checkout', { offer: 'voyage' })}
            >
              <ShoppingBag size={16} aria-hidden="true" />{' '}
              {t('payBuyTrip', { price: prices.voyage })}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={!enabled || busy}
              onClick={() => void go('/api/billing/checkout', { offer: 'annuel' })}
            >
              {t('payBuyYear', { price: prices.annuel })}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.ghost}
            disabled={!enabled || !hasCustomer || busy}
            onClick={() => void go('/api/billing/portal')}
          >
            <CreditCard size={16} aria-hidden="true" /> {t('payManage')}
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className={styles.err}>
          {t('payError')}
        </p>
      ) : null}
    </>
  );
}
