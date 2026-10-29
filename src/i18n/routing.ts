import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en', 'es'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  // `/` est toujours en français (SEO, rendu statique) ; aucun cookie de langue avant consentement.
  localeDetection: false,
  localeCookie: false,
  // Adresses de pages lisibles et traduites par langue (pas d'ancres #).
  pathnames: {
    '/': '/',
    '/plan': { fr: '/plan-anti-jet-lag', en: '/jet-lag-plan', es: '/plan-antijet-lag' },
    '/equipe': { fr: '/equipe-medicale', en: '/medical-team', es: '/equipo-medico' },
    '/blog': '/blog',
    '/blog/[slug]': '/blog/[slug]',
    '/tarifs': { fr: '/tarifs', en: '/pricing', es: '/precios' },
    '/la-science': {
      fr: '/la-science-du-jet-lag',
      en: '/jet-lag-science',
      es: '/ciencia-del-jet-lag',
    },
    '/methode': {
      fr: '/methode-anti-jet-lag',
      en: '/anti-jet-lag-method',
      es: '/metodo-antijet-lag',
    },
    '/sources': {
      fr: '/sources-scientifiques',
      en: '/scientific-sources',
      es: '/fuentes-cientificas',
    },
    '/transparence': {
      fr: '/transparence-commerciale',
      en: '/commercial-transparency',
      es: '/transparencia-comercial',
    },
    '/equipement': { fr: '/equipement-voyage', en: '/travel-gear', es: '/equipamiento-viaje' },
    '/pro': '/fuseo-pro',
    '/mentions-legales': { fr: '/mentions-legales', en: '/legal-notice', es: '/aviso-legal' },
    '/cgv': { fr: '/cgv', en: '/terms-of-sale', es: '/condiciones-de-venta' },
    '/connexion': { fr: '/connexion', en: '/sign-in', es: '/iniciar-sesion' },
    '/mot-de-passe': { fr: '/nouveau-mot-de-passe', en: '/new-password', es: '/nueva-contrasena' },
    '/compte': { fr: '/mon-compte', en: '/account', es: '/mi-cuenta' },
    '/cgu': { fr: '/cgu', en: '/terms-of-use', es: '/condiciones-de-uso' },
    '/cookies': '/cookies',
    '/accessibilite': { fr: '/accessibilite', en: '/accessibility', es: '/accesibilidad' },
    '/confidentialite': { fr: '/confidentialite', en: '/privacy', es: '/privacidad' },
    '/contact': { fr: '/contact', en: '/contact', es: '/contacto' },
    '/plan-du-site': { fr: '/plan-du-site', en: '/site-map', es: '/mapa-del-sitio' },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
/** Pages sans paramètre d'URL. */
export type StaticPathname = Exclude<AppPathname, '/blog/[slug]'>;
