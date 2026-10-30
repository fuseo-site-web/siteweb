'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/** WebMCP : propose des actions du site aux agents IA du navigateur (navigator.modelContext), quand le navigateur le permet. */
interface WebTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}
interface ModelContext {
  registerTool?: (tool: WebTool) => void;
  unregisterTool?: (name: string) => void;
}

const FLIGHT = /^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

export function WebMcp() {
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc?.registerTool) return;

    const tools: WebTool[] = [
      {
        name: 'create_anti_jet_lag_plan',
        description:
          'Ouvre le planificateur Fuseo avec le voyage de l’utilisateur déjà saisi (numéros de vol ou aéroports et dates). Le plan sommeil, lumière et caféine se calcule ensuite sur la page.',
        inputSchema: {
          type: 'object',
          properties: {
            flights: {
              type: 'array',
              maxItems: 4,
              items: { type: 'string' },
              description: 'Numéros de vol, par exemple AF1380',
            },
            dates: {
              type: 'array',
              maxItems: 4,
              items: { type: 'string' },
              description: 'Dates des vols AAAA-MM-JJ, dans le même ordre',
            },
            from: {
              type: 'string',
              description: 'Code IATA de départ, par exemple CDG (si pas de numéro de vol)',
            },
            to: { type: 'string', description: 'Code IATA d’arrivée, par exemple HND' },
            date: { type: 'string', description: 'Date de départ AAAA-MM-JJ' },
            returnDate: { type: 'string', description: 'Date du retour AAAA-MM-JJ' },
          },
        },
        execute: async (a) => {
          const flights = (Array.isArray(a.flights) ? a.flights : [])
            .map(String)
            .filter((f) => FLIGHT.test(f))
            .slice(0, 4);
          const dates = (Array.isArray(a.dates) ? a.dates : []).map(String);
          const q = new URLSearchParams();
          if (flights.length) {
            q.set(
              'out',
              flights
                .map(
                  (f, i) =>
                    `${f.toUpperCase().replace(/\s/g, '')}${DATE.test(dates[i] ?? '') ? `@${dates[i]}` : ''}`,
                )
                .join(','),
            );
          } else if (/^[A-Za-z]{3}$/.test(String(a.from)) && /^[A-Za-z]{3}$/.test(String(a.to))) {
            const from = String(a.from).toUpperCase();
            const to = String(a.to).toUpperCase();
            q.set('out', `${from}-${to}${DATE.test(String(a.date)) ? `-${a.date}` : ''}`);
            if (DATE.test(String(a.returnDate))) q.set('back', `${to}-${from}-${a.returnDate}`);
          } else {
            return text(
              'Indiquez au moins un numéro de vol, ou un aéroport de départ et d’arrivée (codes IATA).',
            );
          }
          router.push({ pathname: '/plan', query: Object.fromEntries(q) });
          return text(
            'Le planificateur Fuseo est ouvert avec votre voyage. Les informations de sommeil s’affichent après le calcul du plan.',
          );
        },
      },
      {
        name: 'search_blog',
        description:
          'Ouvre le blog Fuseo filtré sur un sujet (sommeil, lumière, mélatonine, caféine, décalage horaire…).',
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Mots-clés' } },
          required: ['query'],
        },
        execute: async (a) => {
          const query = String(a.query ?? '')
            .trim()
            .slice(0, 100);
          if (!query) return text('Indiquez un sujet à rechercher.');
          router.push({ pathname: '/blog', query: { q: query } });
          return text(`Blog Fuseo ouvert sur « ${query} ».`);
        },
      },
    ];

    for (const t of tools) {
      try {
        mc.registerTool?.(t);
      } catch {
        /* déjà enregistré ou non pris en charge */
      }
    }
    return () => {
      for (const t of tools) {
        try {
          mc.unregisterTool?.(t.name);
        } catch {
          /* rien à retirer */
        }
      }
    };
  }, [locale, router]);

  return null;
}
