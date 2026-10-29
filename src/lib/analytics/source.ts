/** Classement de l'origine d'une visite (ChatGPT, Google, direct…) à partir du site référent et des paramètres UTM. */

export type Channel = 'ai' | 'search' | 'social' | 'email' | 'campaign' | 'referral' | 'direct';
export interface Origin {
  channel: Channel;
  source: string;
  referrerHost: string | null;
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  ai: 'Assistants IA',
  search: 'Moteurs de recherche',
  social: 'Réseaux sociaux',
  email: 'E-mail',
  campaign: 'Campagnes',
  referral: 'Autres sites',
  direct: 'Accès direct',
};

type Rule = [RegExp, string];

const AI: Rule[] = [
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)(gemini|bard)\.google\.com$/, 'Gemini'],
  [/(^|\.)(claude\.ai|anthropic\.com)$/, 'Claude'],
  [/(^|\.)(copilot\.microsoft\.com|copilot\.cloud\.microsoft)$/, 'Copilot'],
  [/(^|\.)mistral\.ai$/, 'Le Chat (Mistral)'],
  [/(^|\.)deepseek\.com$/, 'DeepSeek'],
  [/(^|\.)(grok\.com|x\.ai)$/, 'Grok'],
  [/(^|\.)you\.com$/, 'You.com'],
  [/(^|\.)phind\.com$/, 'Phind'],
];

const SEARCH: Rule[] = [
  [/(^|\.)google\.[a-z.]{2,6}$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)qwant\.com$/, 'Qwant'],
  [/(^|\.)yahoo\.[a-z.]{2,6}$/, 'Yahoo'],
  [/(^|\.)search\.brave\.com$/, 'Brave Search'],
  [/(^|\.)startpage\.com$/, 'Startpage'],
  [/(^|\.)(yandex\.[a-z]+|baidu\.com)$/, 'Autre moteur'],
];

const SOCIAL: Rule[] = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)pinterest\.[a-z.]{2,6}$/, 'Pinterest'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram'],
  [/(^|\.)snapchat\.com$/, 'Snapchat'],
];

const EMAIL_MEDIUMS = new Set(['email', 'e-mail', 'mail', 'newsletter']);
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paidsocial', 'display', 'ads']);

// Noms utilisés dans utm_source (ex. ChatGPT ajoute utm_source=chatgpt.com).
const UTM_NAMES: Array<[RegExp, Channel, string]> = [
  [/chatgpt|openai/, 'ai', 'ChatGPT'],
  [/perplexity/, 'ai', 'Perplexity'],
  [/gemini|bard/, 'ai', 'Gemini'],
  [/claude|anthropic/, 'ai', 'Claude'],
  [/copilot/, 'ai', 'Copilot'],
  [/mistral/, 'ai', 'Le Chat (Mistral)'],
  [/google/, 'search', 'Google'],
  [/bing/, 'search', 'Bing'],
  [/duckduckgo/, 'search', 'DuckDuckGo'],
  [/facebook|^fb$/, 'social', 'Facebook'],
  [/instagram|^ig$/, 'social', 'Instagram'],
  [/linkedin/, 'social', 'LinkedIn'],
  [/twitter|^x$/, 'social', 'X (Twitter)'],
  [/youtube/, 'social', 'YouTube'],
  [/tiktok/, 'social', 'TikTok'],
  [/whatsapp/, 'social', 'WhatsApp'],
];

const lookup = (rules: Rule[], host: string) => rules.find(([re]) => re.test(host))?.[1];

/** Hôte d'une adresse (sans www ni chemin, jamais le détail de l'URL), ou null. */
export function hostOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return h || null;
  } catch {
    return null;
  }
}

export interface OriginInput {
  referrer?: string | null;
  utm?: { source?: string; medium?: string; campaign?: string };
  /** Hôte du site : une page venant du site lui-même n'est pas une origine. */
  ownHost: string;
}

export function classifyOrigin({ referrer, utm, ownHost }: OriginInput): Origin {
  const host = hostOf(referrer);
  const own = ownHost.replace(/^www\./, '');
  const external = host && host !== own && !host.endsWith(`.${own}`) ? host : null;

  const medium = utm?.medium?.toLowerCase().trim();
  const utmSource = utm?.source?.toLowerCase().trim();

  if (medium && EMAIL_MEDIUMS.has(medium)) {
    return { channel: 'email', source: utmSource || 'E-mail', referrerHost: external };
  }
  if (medium && PAID_MEDIUMS.has(medium)) {
    return { channel: 'campaign', source: utmSource || 'Campagne', referrerHost: external };
  }
  if (utmSource) {
    const named = UTM_NAMES.find(([re]) => re.test(utmSource));
    if (named) return { channel: named[1], source: named[2], referrerHost: external };
    return { channel: 'campaign', source: utmSource, referrerHost: external };
  }
  if (!external) return { channel: 'direct', source: 'Direct', referrerHost: null };

  const ai = lookup(AI, external);
  if (ai) return { channel: 'ai', source: ai, referrerHost: external };
  const search = lookup(SEARCH, external);
  if (search) return { channel: 'search', source: search, referrerHost: external };
  const social = lookup(SOCIAL, external);
  if (social) return { channel: 'social', source: social, referrerHost: external };
  return { channel: 'referral', source: external, referrerHost: external };
}

export function parseDevice(ua: string): {
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
} {
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|Android.*Mobile/i.test(ua)
      ? 'mobile'
      : 'desktop';
  const browser = /SamsungBrowser/i.test(ua)
    ? 'Samsung Internet'
    : /Edg(e|A|iOS)?\//i.test(ua)
      ? 'Edge'
      : /OPR\/|Opera/i.test(ua)
        ? 'Opera'
        : /Firefox|FxiOS/i.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/i.test(ua)
            ? 'Chrome'
            : /Safari/i.test(ua)
              ? 'Safari'
              : 'Autre';
  return { device, browser };
}

/** Robots et navigateurs automatisés : jamais comptés comme des visiteurs. */
export const isBot = (ua: string) =>
  !ua ||
  /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|node-fetch/i.test(
    ua,
  );

/** Pays depuis l'en-tête de géolocalisation Netlify (x-nf-geo, JSON en base64). */
export function countryOf(headers: Headers): string | null {
  const raw = headers.get('x-nf-geo');
  if (raw) {
    try {
      const code = (
        JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as { country?: { code?: string } }
      ).country?.code;
      if (code && /^[A-Za-z]{2}$/.test(code)) return code.toUpperCase();
    } catch {
      /* en-tête illisible */
    }
  }
  const alt = headers.get('x-country');
  return alt && /^[A-Za-z]{2}$/.test(alt) ? alt.toUpperCase() : null;
}

export const localeOfPath = (path: string): 'fr' | 'en' | 'es' =>
  /^\/en(\/|$)/.test(path) ? 'en' : /^\/es(\/|$)/.test(path) ? 'es' : 'fr';
