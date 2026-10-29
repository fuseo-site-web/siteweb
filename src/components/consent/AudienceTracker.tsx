'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/navigation';
import { clarityAllowed } from '@/lib/consent/consent';
import { measurable } from '@/lib/consent/host';
import type { TrackedEvent } from '@/lib/analytics/events';

const SID_KEY = 'fuseo_sid';

function sessionId(): { sid: string; fresh: boolean } {
  try {
    const known = sessionStorage.getItem(SID_KEY);
    if (known) return { sid: known, fresh: false };
    const sid = crypto.randomUUID();
    sessionStorage.setItem(SID_KEY, sid);
    return { sid, fresh: true };
  } catch {
    return { sid: crypto.randomUUID(), fresh: false };
  }
}

/** Libellé lisible d'un élément cliqué : jamais de saisie, uniquement le texte d'un lien ou d'un bouton. */
function describe(el: Element): { label: string; target?: string } {
  const text =
    (el as HTMLElement).dataset.track ||
    el.getAttribute('aria-label') ||
    (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  let target: string | undefined;
  if (el instanceof HTMLAnchorElement && el.href) {
    try {
      const u = new URL(el.href);
      target = u.origin === location.origin ? u.pathname : u.hostname;
    } catch {
      /* lien invalide */
    }
  }
  return { label: (text || target || '').slice(0, 120), target: target?.slice(0, 300) };
}

/**
 * Mesure d'audience interne (sous consentement) : pages vues et clics, envoyés par lots à /api/events.
 * Les clics ne sont pas mesurés sur les pages de plan, de compte et de connexion.
 */
export function AudienceTracker({
  analytics,
  visitorId,
}: {
  analytics: boolean;
  visitorId: string | null;
}) {
  const path = usePathname();
  const queue = useRef<TrackedEvent[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const pathRef = useRef(path);
  const sid = useRef<string>('');

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!analytics || !visitorId || !measurable()) return;

    const flush = () => {
      window.clearTimeout(timer.current);
      if (!queue.current.length) return;
      const body = JSON.stringify({
        vid: visitorId,
        sid: sid.current,
        events: queue.current.splice(0, 20),
      });
      const sent = navigator.sendBeacon?.(
        '/api/events',
        new Blob([body], { type: 'application/json' }),
      );
      if (!sent) {
        void fetch('/api/events', { method: 'POST', body, keepalive: true }).catch(() => undefined);
      }
    };
    const push = (e: TrackedEvent) => {
      queue.current.push(e);
      if (queue.current.length >= 10) flush();
      else {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(flush, 2500);
      }
    };

    const { sid: id, fresh } = sessionId();
    sid.current = id;
    const q = new URLSearchParams(location.search);
    push({
      name: 'page_view',
      path: location.pathname,
      ...(fresh
        ? {
            entry: true,
            ref: document.referrer || undefined,
            utm: {
              source: q.get('utm_source') ?? undefined,
              medium: q.get('utm_medium') ?? undefined,
              campaign: q.get('utm_campaign') ?? undefined,
            },
          }
        : {}),
    });

    const onClick = (ev: MouseEvent) => {
      if (!clarityAllowed(pathRef.current)) return;
      const el = (ev.target as Element | null)?.closest?.(
        'a, button, [role="button"], [data-track]',
      );
      if (!el || el.closest('[role="dialog"]')) return;
      const { label, target } = describe(el);
      if (label) push({ name: 'click', path: location.pathname, label, target });
    };
    const onHide = () => document.visibilityState === 'hidden' && flush();

    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [analytics, visitorId]);

  // Navigation côté client : une nouvelle page vue par changement d'adresse.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!analytics || !visitorId || !measurable()) return;
    const body = JSON.stringify({
      vid: visitorId,
      sid: sessionId().sid,
      events: [{ name: 'page_view', path: location.pathname }],
    });
    const sent = navigator.sendBeacon?.(
      '/api/events',
      new Blob([body], { type: 'application/json' }),
    );
    if (!sent)
      void fetch('/api/events', { method: 'POST', body, keepalive: true }).catch(() => undefined);
  }, [path, analytics, visitorId]);

  return null;
}
