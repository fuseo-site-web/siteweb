'use client';

import { useEffect } from 'react';
import { env } from '@/env';
import { usePathname } from '@/i18n/navigation';
import { clarityAllowed } from '@/lib/consent/consent';

type Win = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  __fuseoGa?: boolean;
  __fuseoClarity?: boolean;
};

const SITE_HOST = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
const LOCAL_HOST = /^(localhost|127(\.\d+){3}|\[::1\]|.+\.localhost|.+\.local)$/;

/** Mesure uniquement sur le vrai domaine : ni en local, ni sur les aperçus de déploiement. */
function measurable() {
  const h = location.hostname;
  return !LOCAL_HOST.test(h) && (h === SITE_HOST || h === `www.${SITE_HOST}`);
}

const GA_ID = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CLARITY_ID = env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

function addScript(src: string) {
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  document.head.appendChild(el);
}

function startGa(w: Win, id: string) {
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag() {
    // gtag exige l'objet `arguments`, pas un tableau.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  // Consent Mode v2 : tout refusé par défaut, seule la mesure d'audience est accordée.
  w.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  w.gtag('consent', 'update', { analytics_storage: 'granted' });
  w.gtag('js', new Date());
  w.gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  w.__fuseoGa = true;
}

function startClarity(w: Win, id: string) {
  if (!w.clarity) {
    const c = function clarity(...args: unknown[]) {
      (c.q = c.q ?? []).push(args);
    } as NonNullable<Win['clarity']>;
    w.clarity = c;
  }
  addScript(`https://www.clarity.ms/tag/${encodeURIComponent(id)}`);
  w.__fuseoClarity = true;
}

function wipeCookies() {
  for (const part of document.cookie.split('; ')) {
    const name = part.split('=')[0] ?? '';
    if (/^(_ga|_gid|_gat|_clck|_clsk|CLID|MUID|SM)/.test(name)) {
      const host = location.hostname.split('.').slice(-2).join('.');
      for (const domain of ['', `; Domain=${host}`, `; Domain=.${host}`]) {
        document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
      }
    }
  }
}

/** Charge GA4 et Clarity uniquement si la mesure d'audience est acceptée. Sinon : aucune requête tierce. */
export function AnalyticsLoader({ analytics }: { analytics: boolean }) {
  const path = usePathname();

  useEffect(() => {
    const w = window as Win;
    if (!measurable()) return;
    if (!analytics) {
      // Choix retiré après acceptation : on coupe la mesure et on efface les cookies.
      if (w.__fuseoGa || w.__fuseoClarity) {
        if (GA_ID) (w as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
        w.clarity?.('stop');
        w.__fuseoGa = false;
        w.__fuseoClarity = false;
        wipeCookies();
      }
      return;
    }
    if (GA_ID) {
      (w as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false;
      if (!w.__fuseoGa && !document.querySelector('script[src*="googletagmanager.com/gtag"]')) {
        startGa(w, GA_ID);
      } else {
        w.__fuseoGa = true;
        w.gtag?.('consent', 'update', { analytics_storage: 'granted' });
      }
    }
  }, [analytics]);

  useEffect(() => {
    const w = window as Win;
    if (!analytics || !CLARITY_ID || !measurable()) return;
    if (clarityAllowed(path)) {
      if (!w.__fuseoClarity) {
        if (w.clarity && document.querySelector('script[src*="clarity.ms/tag"]')) {
          w.clarity('start');
          w.__fuseoClarity = true;
        } else startClarity(w, CLARITY_ID);
      }
    } else if (w.__fuseoClarity) {
      // Navigation vers une page sensible (plan, compte…) : l'enregistrement s'arrête.
      w.clarity?.('stop');
      w.__fuseoClarity = false;
    }
  }, [analytics, path]);

  return null;
}
