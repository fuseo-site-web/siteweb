import type { IconName } from '@/components/ui/Icon';
import type { StaticPathname } from '@/i18n/routing';
import type { PageName } from './pages';

/** Habillage de chaque page de contenu : icônes (en-tête, titres, cartes) et pages liées. Aucun texte ici. */
export interface PageMeta {
  icon: IconName;
  /** Icônes des titres h2, dans l'ordre d'apparition (cycle si la page en a plus). */
  headings?: IconName[];
  /** Icônes des cartes, par bloc « cards » puis par carte (une carte avec un chiffre en exergue n'a pas d'icône). */
  cards?: IconName[][];
  /** Icônes des étapes d'une liste ordonnée, par liste. */
  steps?: IconName[][];
  related: RelatedKey[];
  /** Liste de références numérotées (page « sources »). */
  refs?: boolean;
  /** Sommaire latéral (pages longues). */
  toc?: boolean;
  /** Appel à l'action final (pages éditoriales uniquement). */
  cta?: boolean;
}

export type RelatedKey =
  | 'science'
  | 'method'
  | 'team'
  | 'blog'
  | 'pricing'
  | 'sources'
  | 'transparency'
  | 'gear'
  | 'pro'
  | 'mentions'
  | 'cgv'
  | 'cgu'
  | 'privacy'
  | 'cookies'
  | 'accessibility'
  | 'sitemap'
  | 'plan';

/** Pages vers lesquelles pointent les cartes « pour aller plus loin ». */
export const RELATED_TARGET: Record<RelatedKey, { href: StaticPathname; icon: IconName }> = {
  science: { href: '/la-science', icon: 'microscope' },
  method: { href: '/methode', icon: 'cpu' },
  team: { href: '/equipe', icon: 'stethoscope' },
  blog: { href: '/blog', icon: 'news' },
  pricing: { href: '/tarifs', icon: 'tag' },
  sources: { href: '/sources', icon: 'book' },
  transparency: { href: '/transparence', icon: 'eye' },
  gear: { href: '/equipement', icon: 'backpack' },
  pro: { href: '/pro', icon: 'briefcase' },
  mentions: { href: '/mentions-legales', icon: 'building' },
  cgv: { href: '/cgv', icon: 'receipt' },
  cgu: { href: '/cgu', icon: 'file' },
  privacy: { href: '/confidentialite', icon: 'shield' },
  cookies: { href: '/cookies', icon: 'cookie' },
  accessibility: { href: '/accessibilite', icon: 'accessibility' },
  sitemap: { href: '/plan-du-site', icon: 'map' },
  plan: { href: '/plan', icon: 'plane' },
};

export const PAGE_META: Record<PageName, PageMeta> = {
  science: {
    icon: 'microscope',
    headings: ['brain', 'bed', 'activity', 'hourglass', 'bulb', 'sparkles'],
    cards: [
      ['battery-low', 'globe'],
      ['bed', 'activity', 'utensils', 'smile', 'trending', 'shield'],
      ['droplets', 'bed', 'sun', 'pill', 'clock', 'brain'],
      ['sun', 'moon', 'coffee'],
    ],
    related: ['method', 'sources', 'blog'],
    toc: true,
    cta: true,
  },
  method: {
    icon: 'cpu',
    headings: ['route', 'cpu', 'rocket', 'badge-check', 'checklist', 'info'],
    cards: [
      [],
      ['clock', 'sun', 'moon', 'pill'],
      ['route', 'calendar-clock', 'navigation', 'shield', 'users', 'lifebuoy'],
    ],
    steps: [['user', 'plane', 'clock', 'layers', 'filter', 'shield']],
    related: ['science', 'sources', 'team'],
    toc: true,
    cta: true,
  },
  sources: { icon: 'book', refs: true, related: ['science', 'method', 'blog'], cta: true },
  transparency: { icon: 'eye', related: ['pricing', 'method', 'mentions'] },
  gear: {
    icon: 'backpack',
    cards: [['lamp', 'moon', 'headphones', 'armchair']],
    related: ['science', 'blog', 'pricing'],
    cta: true,
  },
  pro: {
    icon: 'briefcase',
    cards: [['users', 'briefcase']],
    related: ['pricing', 'team', 'method'],
  },
  mentions: {
    icon: 'building',
    headings: ['building', 'user', 'server', 'microscope', 'info', 'copyright'],
    related: ['privacy', 'cgv', 'cgu'],
    toc: true,
  },
  cgv: {
    icon: 'receipt',
    headings: [
      'file',
      'tag',
      'card',
      'unlock',
      'undo',
      'info',
      'shield',
      'lock',
      'warning',
      'gavel',
    ],
    related: ['pricing', 'transparency', 'privacy'],
    toc: true,
  },
  privacy: {
    icon: 'shield',
    headings: ['user-check', 'phone', 'card', 'server', 'cookie', 'fingerprint'],
    related: ['cookies', 'cgu', 'mentions'],
    toc: true,
  },
  cgu: {
    icon: 'file',
    headings: ['file', 'user', 'shield', 'info', 'lock', 'scale', 'gavel'],
    related: ['cgv', 'privacy', 'cookies'],
    toc: true,
  },
  cookies: {
    icon: 'cookie',
    headings: ['cookie', 'shield', 'eye', 'info', 'fingerprint', 'scale'],
    related: ['privacy', 'cgu', 'mentions'],
    toc: true,
  },
  accessibility: {
    icon: 'accessibility',
    headings: ['accessibility', 'checklist', 'info', 'warning', 'user', 'scale'],
    related: ['sitemap', 'mentions', 'cookies'],
    toc: true,
  },
};
