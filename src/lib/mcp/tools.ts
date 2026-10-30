import { z } from 'zod';
import { getPost, getPosts } from '@/content/blog';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { cityName, getAirport, searchAirports } from '@/lib/airports';
import { norm } from '@/lib/blog-search';
import { blocksToMarkdown, htmlToMd } from '@/lib/content-text';
import { timeZoneShift } from './shift';

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
const locale = z.enum(['fr', 'en', 'es']).default('fr').describe('Langue : fr, en ou es');
const iata = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/)
  .describe('Code IATA de l’aéroport, par exemple CDG');

export interface Tool<S extends z.ZodType = z.ZodType> {
  name: string;
  title: string;
  description: string;
  schema: S;
  run: (args: z.output<S>) => Promise<string>;
}

const articleUrl = (l: 'fr' | 'en' | 'es', slug: string) =>
  base + getPathname({ href: { pathname: '/blog/[slug]', params: { slug } }, locale: l });

const tool = <S extends z.ZodType>(t: Tool<S>) => t as unknown as Tool;

/**
 * Outils du serveur MCP public de Fuseo. Tous en lecture seule, sans donnée personnelle, sans conseil médical individuel :
 * ils exposent le contenu publié du site et des faits (fuseaux horaires).
 */
export const TOOLS: Tool[] = [
  tool({
    name: 'site_info',
    title: 'Présentation de Fuseo',
    description: 'Ce que fait Fuseo, qui l’a conçu et où trouver les pages principales.',
    schema: z.object({}),
    run: async () =>
      [
        'Fuseo calcule un plan anti-jet lag personnalisé : à partir des horaires de vol, il indique quand dormir, chercher la lumière, l’éviter, faire une sieste et arrêter la caféine pour adapter son horloge biologique au fuseau d’arrivée.',
        'Conçu avec l’Institut Médical du Sommeil (Paris). Éditeur : SLEEPTECHNOLOGY.',
        'Le service donne des informations générales et ne remplace pas l’avis d’un professionnel de santé.',
        `Site : ${base} (français), ${base}/en (anglais), ${base}/es (espagnol).`,
        `Calculer un plan : ${base}${getPathname({ href: '/plan', locale: 'fr' })}`,
        `Texte complet : ${base}/llms-full.txt · Présentation : ${base}/llms.txt · Contact : contact@fuseo.net`,
      ].join('\n'),
  }),
  tool({
    name: 'search_articles',
    title: 'Rechercher dans le blog',
    description:
      'Cherche des articles du blog Fuseo (sommeil, décalage horaire, lumière, mélatonine, caféine…). Retourne titre, résumé et adresse.',
    schema: z.object({
      query: z.string().trim().min(1).max(100).describe('Mots-clés, par exemple « mélatonine »'),
      locale,
      limit: z.number().int().min(1).max(10).default(5),
    }),
    run: async ({
      query,
      locale: l,
      limit,
    }: {
      query: string;
      locale: 'fr' | 'en' | 'es';
      limit: number;
    }) => {
      const words = norm(query).split(' ').filter(Boolean);
      const posts = await getPosts(l);
      const hits = posts
        .filter((p) => {
          const hay = norm([p.title, p.lead, p.tag, blocksToMarkdown(p.blocks)].join(' '));
          return words.every((w) => hay.includes(w));
        })
        .slice(0, limit);
      if (!hits.length) return `Aucun article ne correspond à « ${query} ».`;
      return hits
        .map(
          (p) =>
            `- ${htmlToMd(p.title)} (${p.readTime})\n  ${htmlToMd(p.excerpt)}\n  slug : ${p.slug}\n  ${articleUrl(l, p.slug)}`,
        )
        .join('\n');
    },
  }),
  tool({
    name: 'get_article',
    title: 'Lire un article',
    description:
      'Retourne le texte complet d’un article du blog en Markdown, avec ses références scientifiques.',
    schema: z.object({
      slug: z.string().trim().min(3).max(120).describe('Slug de l’article (voir search_articles)'),
      locale,
    }),
    run: async ({ slug, locale: l }: { slug: string; locale: 'fr' | 'en' | 'es' }) => {
      const p = await getPost(l, slug);
      if (!p) return `Article introuvable : ${slug}`;
      return [
        `# ${htmlToMd(p.title)}`,
        `Adresse : ${articleUrl(l, p.slug)}`,
        htmlToMd(p.lead),
        blocksToMarkdown(p.blocks, base),
        p.keep ? `**${p.keepLabel}** ${htmlToMd(p.keep, base)}` : '',
        p.refs.length
          ? `Références :\n${p.refs.map((r, i) => `${i + 1}. ${htmlToMd(r, base)}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    },
  }),
  tool({
    name: 'search_airports',
    title: 'Trouver un aéroport',
    description:
      'Retrouve le code IATA d’un aéroport à partir d’une ville ou d’un nom (aéroports pris en charge par Fuseo).',
    schema: z.object({
      query: z.string().trim().min(1).max(60),
      locale,
      limit: z.number().int().min(1).max(10).default(5),
    }),
    run: async ({
      query,
      locale: l,
      limit,
    }: {
      query: string;
      locale: 'fr' | 'en' | 'es';
      limit: number;
    }) => {
      const hits = searchAirports(query, l, limit);
      return hits.length
        ? hits.map((a) => `${a.code} : ${cityName(a, l)} (${a.name})`).join('\n')
        : `Aucun aéroport trouvé pour « ${query} ».`;
    },
  }),
  tool({
    name: 'time_zone_shift',
    title: 'Décalage horaire d’un trajet',
    description:
      'Calcule le décalage horaire entre deux aéroports (en heures, vers l’est ou l’ouest) et donne le lien pour créer le plan personnalisé. Fait objectif, pas un conseil médical.',
    schema: z.object({
      from: iata,
      to: iata,
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Date du vol AAAA-MM-JJ (les changements d’heure sont pris en compte)'),
      locale,
    }),
    run: async ({
      from,
      to,
      date,
      locale: l,
    }: {
      from: string;
      to: string;
      date?: string;
      locale: 'fr' | 'en' | 'es';
    }) => {
      const a = getAirport(from);
      const b = getAirport(to);
      if (!a || !b)
        return `Aéroport inconnu : ${!a ? from : to}. Utilisez search_airports pour trouver le code.`;
      const day = date ?? new Date().toISOString().slice(0, 10);
      const s = timeZoneShift(a.tz, b.tz, day);
      const dir =
        s.direction === 'none'
          ? 'aucun décalage'
          : `${Math.abs(s.hours).toLocaleString('fr-FR')} h vers l’${s.direction === 'east' ? 'est' : 'ouest'}`;
      const plan =
        base +
        getPathname({ href: '/plan', locale: l }) +
        `?out=${from}-${to}${date ? `-${date}` : ''}`;
      return `${cityName(a, l)} (${from}) → ${cityName(b, l)} (${to}) : ${dir} le ${day}.\nPour un plan personnalisé (quand dormir, lumière, caféine, sieste) : ${plan}`;
    },
  }),
];

export const toolByName = (name: string) => TOOLS.find((t) => t.name === name);
