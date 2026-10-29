'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  CONSENT_COOKIE,
  makeConsent,
  parseConsent,
  readCookie,
  serializeConsent,
  type Consent,
} from '@/lib/consent/consent';
import { AnalyticsLoader } from './AnalyticsLoader';
import { ConsentBanner } from './ConsentBanner';

type Ctx = {
  consent: Consent | null;
  ready: boolean;
  open: boolean;
  save: (analytics: boolean) => void;
  reopen: () => void;
  close: () => void;
};

const ConsentContext = createContext<Ctx | null>(null);

// Magasin minimal sur le cookie : le serveur ne connaît pas le choix (null), le navigateur le lit après hydratation.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const readRaw = () => readCookie(document.cookie, CONSENT_COOKIE) ?? '';
const readServer = () => null;

export function useConsent(): Ctx {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent doit être utilisé dans <ConsentProvider>');
  return ctx;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore<string | null>(subscribe, readRaw, readServer);
  const ready = raw !== null;
  const consent = useMemo(() => parseConsent(raw), [raw]);
  const [reopened, setReopened] = useState(false);

  const save = useCallback(
    (analytics: boolean) => {
      const next = makeConsent(analytics, consent?.id ?? crypto.randomUUID());
      document.cookie = serializeConsent(next, location.protocol === 'https:');
      // Preuve du choix : un échec ne doit jamais bloquer l'utilisateur.
      void fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          id: next.id,
          analytics,
          version: next.v,
          source: consent ? 'footer' : 'banner',
        }),
      }).catch(() => undefined);
      setReopened(false);
      listeners.forEach((cb) => cb());
    },
    [consent],
  );

  const value = useMemo<Ctx>(
    () => ({
      consent,
      ready,
      open: ready && (consent === null || reopened),
      save,
      reopen: () => setReopened(true),
      close: () => setReopened(false),
    }),
    [consent, ready, reopened, save],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <AnalyticsLoader analytics={consent?.analytics === true} />
      <ConsentBanner />
    </ConsentContext.Provider>
  );
}
