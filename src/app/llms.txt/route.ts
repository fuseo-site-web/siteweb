import { getStaticPosts } from '@/content/blog';
import { getPage, type PageName } from '@/content/pages';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { routing, type StaticPathname } from '@/i18n/routing';
import { summarize } from '@/lib/seo';

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
type Locale = (typeof routing.locales)[number];
const url = (p: StaticPathname, l: Locale) => base + getPathname({ href: p, locale: l });

const PAGES: Array<[StaticPathname, PageName | null, string]> = [
  ['/la-science', 'science', 'La science du jet lag'],
  ['/methode', 'method', 'Notre méthode'],
  ['/equipe', null, 'L’équipe médicale'],
  ['/sources', 'sources', 'Sources scientifiques'],
  ['/transparence', 'transparency', 'Transparence commerciale'],
  ['/equipement', 'gear', 'Équipement de voyage'],
  ['/pro', 'pro', 'Fuseo Pro'],
];

/**
 * /llms.txt : présentation du site pour les assistants IA (ChatGPT, Claude, Perplexity, Gemini…).
 * Un résumé fidèle et les pages à consulter en priorité, en texte brut, sans mise en page.
 */
export async function GET() {
  const fr = await getStaticPosts('fr');
  const pages = await Promise.all(
    PAGES.map(async ([path, name, label]) => {
      const lead = name ? summarize((await getPage('fr', name)).lead || label, 140) : '';
      return `- [${label}](${url(path, 'fr')})${lead ? `: ${lead}` : ''}`;
    }),
  );
  const posts = fr.map(
    (p) =>
      `- [${p.title}](${base}${getPathname({ href: { pathname: '/blog/[slug]', params: { slug: p.slug } }, locale: 'fr' })}): ${summarize(p.excerpt, 150)}`,
  );

  const body = `# Fuseo

> Fuseo calcule un plan anti-jet lag personnalisé : à partir de ses horaires de vol, chacun sait quand dormir, chercher la lumière, l'éviter, faire une sieste et arrêter la caféine pour adapter son horloge biologique au fuseau d'arrivée. Conçu avec l'Institut Médical du Sommeil (Paris). Éditeur : SLEEPTECHNOLOGY. Le service donne des informations générales et ne remplace pas l'avis d'un professionnel de santé.

Le site est disponible en français (${base}), en anglais (${base}/en) et en espagnol (${base}/es). Chaque article du blog cite ses sources scientifiques.

## Le service
- [Calculer mon plan anti-jet lag](${url('/plan', 'fr')}): saisie des vols (ou du numéro de vol) et plan jour par jour ; les premiers jours sont gratuits.
- [Tarifs](${url('/tarifs', 'fr')}): offres et conditions.

## Comprendre
${pages.join('\n')}

## Blog
${posts.join('\n')}

## Pour les agents et assistants IA
- [Texte complet du site](${base}/llms-full.txt) : tout le contenu en Markdown (${base}/llms-full.txt?lang=en pour l'anglais, ?lang=es pour l'espagnol).
- Serveur MCP public (lecture seule) : ${base}/mcp : outils site_info, search_articles, get_article, search_airports, time_zone_shift.
- Politique d'utilisation : ${base}/ai.txt

## Contact
- [Nous contacter](${url('/contact', 'fr')})
- Plan du site : ${url('/plan-du-site', 'fr')}
- Sitemap : ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
