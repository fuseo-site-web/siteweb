import type { MetadataRoute } from 'next';
import { env } from '@/env';

/** Pages jamais proposées aux robots : espace privé, API, connexion et compte (dans les trois langues). */
const PRIVATE = [
  '/api/',
  '/auth/',
  '/admin/',
  '/mon-compte',
  '/connexion',
  '/nouveau-mot-de-passe',
  '/en/new-password',
  '/es/nueva-contrasena',
  '/en/account',
  '/en/sign-in',
  '/es/mi-cuenta',
  '/es/iniciar-sesion',
];

/**
 * Robots des assistants et moteurs IA, autorisés explicitement : Fuseo veut être cité.
 * Un groupe nommé remplace le groupe « * » : les pages privées sont donc répétées dans chaque groupe.
 */
const AI_AGENTS = [
  // Recherche et consultation à la demande d'un utilisateur
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'DuckAssistBot',
  'MistralAI-User',
  'Applebot',
  'Amazonbot',
  // Constitution des connaissances des modèles
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'cohere-ai',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
