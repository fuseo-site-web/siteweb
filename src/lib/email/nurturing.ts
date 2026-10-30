import { esc, renderEmail, SITE, type EmailContent, type Lang } from './layout';

/**
 * Séquences de nurturing de Fuseo : accompagner un compte de l'inscription au premier plan, puis au voyage suivant.
 * Les textes reprennent le vocabulaire du site ; aucun conseil médical nouveau : les conseils renvoient vers les articles existants.
 */

export type SequenceId = 'welcome' | 'first-plan' | 'pre-trip' | 'post-trip' | 'newsletter';

export interface Sequence {
  id: SequenceId;
  name: string;
  /** Quand l'envoyer. */
  trigger: string;
  /** À qui. */
  audience: string;
  /** Commercial = désinscription obligatoire et consentement requis. Service = lié au compte ou au voyage. */
  kind: 'service' | 'marketing';
  goal: string;
}

export const SEQUENCES: Sequence[] = [
  {
    id: 'welcome',
    name: 'Bienvenue',
    trigger: 'Juste après la création du compte et le profil rempli',
    audience: 'Tout nouveau compte',
    kind: 'service',
    goal: 'Expliquer le fonctionnement et amener au premier plan.',
  },
  {
    id: 'first-plan',
    name: 'Premier plan',
    trigger: '3 jours après l’inscription, si aucun voyage n’est enregistré',
    audience: 'Comptes sans voyage',
    kind: 'marketing',
    goal: 'Relancer doucement les comptes qui n’ont pas encore créé de plan.',
  },
  {
    id: 'pre-trip',
    name: 'Voyage qui approche',
    trigger: '3 jours avant le départ, pour les clients ayant demandé les rappels',
    audience: 'Voyages enregistrés avec rappels activés',
    kind: 'service',
    goal: 'Faire ouvrir le plan au bon moment et orienter vers l’article de préparation.',
  },
  {
    id: 'post-trip',
    name: 'Après le voyage',
    trigger: '2 jours après l’arrivée',
    audience: 'Voyages terminés',
    kind: 'service',
    goal: 'Recueillir un avis et ramener vers le prochain voyage.',
  },
  {
    id: 'newsletter',
    name: 'Nouveautés du blog',
    trigger: 'Une fois par mois',
    audience: 'Abonnés confirmés à la newsletter (double confirmation)',
    kind: 'marketing',
    goal: 'Entretenir la relation avec les articles du blog.',
  },
];

export interface ArticleRef {
  slug: string;
  title: string;
  excerpt: string;
}

export interface BuildVars {
  firstName?: string;
  email?: string;
  articles?: ArticleRef[];
  unsubscribeUrl?: string;
}

const PATH = {
  plan: { fr: '/plan-anti-jet-lag', en: '/en/jet-lag-plan', es: '/es/plan-antijet-lag' },
  account: { fr: '/mon-compte', en: '/en/account', es: '/es/mi-cuenta' },
  contact: { fr: '/contact', en: '/en/contact', es: '/es/contacto' },
  blog: { fr: '/blog', en: '/en/blog', es: '/es/blog' },
} as const;
const BLOG_PREFIX: Record<Lang, string> = { fr: '/blog', en: '/en/blog', es: '/es/blog' };

/** Lien suivi : la mesure d'audience de l'admin reconnaît utm_medium=email. */
const url = (path: string, campaign: string) =>
  `${SITE}${path}${path.includes('?') ? '&' : '?'}utm_source=fuseo&utm_medium=email&utm_campaign=${campaign}`;
const articleUrl = (lang: Lang, slug: string, campaign: string) =>
  url(`${BLOG_PREFIX[lang]}/${slug}`, campaign);

const hello = (lang: Lang, name?: string) => {
  const n = name?.trim();
  return n
    ? { fr: `Bonjour ${n},`, en: `Hello ${n},`, es: `Hola ${n},` }[lang]
    : { fr: 'Bonjour,', en: 'Hello,', es: 'Hola,' }[lang];
};
const SIGN: Record<Lang, string> = {
  fr: 'À bientôt,\nL’équipe Fuseo',
  en: 'See you soon,\nThe Fuseo team',
  es: 'Hasta pronto,\nEl equipo de Fuseo',
};
const READ: Record<Lang, string> = {
  fr: 'Lire l’article',
  en: 'Read the article',
  es: 'Leer el artículo',
};

type Copy = Record<
  Lang,
  Omit<EmailContent, 'signature' | 'cta' | 'secondary' | 'articles'> & {
    cta: string;
    secondary?: string;
  }
>;

const welcome: Copy = {
  fr: {
    subject: 'Bienvenue chez Fuseo : votre espace est prêt',
    preheader: 'Calculez votre premier plan anti-jet lag en quelques minutes.',
    title: 'Bienvenue à bord',
    intro: ['Votre espace Fuseo est prêt. Voici comment ça marche :'],
    steps: [
      {
        title: 'Entrez vos vols',
        text: 'Aéroports, dates et heures, ou simplement votre numéro de vol.',
      },
      {
        title: 'Fuseo calcule votre plan',
        text: 'Jour par jour : quand dormir, chercher la lumière, l’éviter, faire une sieste et arrêter la caféine.',
      },
      {
        title: 'Retrouvez vos voyages',
        text: 'Vos voyages enregistrés prennent la forme de billets dans votre espace, avec le plan en PDF à télécharger.',
      },
    ],
    note: 'Les premiers jours de votre plan s’affichent sans rien payer.',
    cta: 'Créer mon plan anti-jet lag',
    secondary: 'Voir mon espace',
  },
  en: {
    subject: 'Welcome to Fuseo: your space is ready',
    preheader: 'Calculate your first anti-jet-lag plan in a few minutes.',
    title: 'Welcome aboard',
    intro: ['Your Fuseo space is ready. Here is how it works:'],
    steps: [
      {
        title: 'Enter your flights',
        text: 'Airports, dates and times, or simply your flight number.',
      },
      {
        title: 'Fuseo calculates your plan',
        text: 'Day by day: when to sleep, seek light, avoid it, nap and stop caffeine.',
      },
      {
        title: 'Find your trips',
        text: 'Your saved trips appear as tickets in your space, with the plan as a PDF to download.',
      },
    ],
    note: 'The first days of your plan are shown for free.',
    cta: 'Create my anti-jet-lag plan',
    secondary: 'Open my space',
  },
  es: {
    subject: 'Bienvenido a Fuseo: su espacio está listo',
    preheader: 'Calcule su primer plan antijet lag en unos minutos.',
    title: 'Bienvenido a bordo',
    intro: ['Su espacio Fuseo está listo. Así funciona:'],
    steps: [
      {
        title: 'Indique sus vuelos',
        text: 'Aeropuertos, fechas y horas, o simplemente su número de vuelo.',
      },
      {
        title: 'Fuseo calcula su plan',
        text: 'Día a día: cuándo dormir, buscar la luz, evitarla, hacer una siesta y dejar la cafeína.',
      },
      {
        title: 'Encuentre sus viajes',
        text: 'Sus viajes guardados aparecen como billetes en su espacio, con el plan en PDF para descargar.',
      },
    ],
    note: 'Los primeros días de su plan se muestran gratis.',
    cta: 'Crear mi plan antijet lag',
    secondary: 'Abrir mi espacio',
  },
};

const firstPlan: Copy = {
  fr: {
    subject: 'Un vol en vue ? Votre premier plan vous attend',
    preheader: 'Entrez vos horaires de vol : Fuseo calcule le reste.',
    title: 'Un vol en vue ? Préparez-le en quelques minutes',
    intro: [
      'Votre compte Fuseo est créé, mais vous n’avez pas encore de voyage enregistré.',
      'Entrez vos horaires de vol : Fuseo calcule quand dormir, chercher la lumière, l’éviter, faire une sieste et arrêter la caféine pour vous adapter au fuseau d’arrivée.',
    ],
    note: 'Commencez gratuitement : les premiers jours de votre plan s’affichent sans rien payer.',
    cta: 'Calculer mon plan',
  },
  en: {
    subject: 'A flight coming up? Your first plan is waiting',
    preheader: 'Enter your flight times: Fuseo calculates the rest.',
    title: 'A flight coming up? Prepare it in a few minutes',
    intro: [
      'Your Fuseo account is created, but you have no saved trip yet.',
      'Enter your flight times: Fuseo calculates when to sleep, seek light, avoid it, nap and stop caffeine to adapt to the arrival time zone.',
    ],
    note: 'Start for free: the first days of your plan are shown without paying anything.',
    cta: 'Calculate my plan',
  },
  es: {
    subject: '¿Tiene un vuelo próximo? Su primer plan le espera',
    preheader: 'Indique sus horarios de vuelo: Fuseo calcula el resto.',
    title: '¿Tiene un vuelo próximo? Prepárelo en unos minutos',
    intro: [
      'Su cuenta de Fuseo está creada, pero todavía no tiene ningún viaje guardado.',
      'Indique sus horarios de vuelo: Fuseo calcula cuándo dormir, buscar la luz, evitarla, hacer una siesta y dejar la cafeína para adaptarse al huso horario de llegada.',
    ],
    note: 'Empiece gratis: los primeros días de su plan se muestran sin pagar nada.',
    cta: 'Calcular mi plan',
  },
};

const preTrip: Copy = {
  fr: {
    subject: 'Votre voyage approche : ouvrez votre plan',
    preheader: 'Quelques jours avant le départ, c’est le bon moment pour relire votre plan.',
    title: 'Votre voyage approche',
    intro: [
      'Le départ est proche. Ouvrez votre plan Fuseo pour revoir, jour par jour, ce qu’il y a à faire.',
      'Et pour bien démarrer, un article à lire avant de partir :',
    ],
    cta: 'Ouvrir mon plan',
  },
  en: {
    subject: 'Your trip is coming up: open your plan',
    preheader: 'A few days before departure is the right time to read your plan again.',
    title: 'Your trip is coming up',
    intro: [
      'Departure is near. Open your Fuseo plan to review, day by day, what there is to do.',
      'And to get off to a good start, an article to read before you leave:',
    ],
    cta: 'Open my plan',
  },
  es: {
    subject: 'Su viaje se acerca: abra su plan',
    preheader: 'A pocos días de la salida es el buen momento para releer su plan.',
    title: 'Su viaje se acerca',
    intro: [
      'La salida está cerca. Abra su plan Fuseo para repasar, día a día, lo que hay que hacer.',
      'Y para empezar bien, un artículo para leer antes de partir:',
    ],
    cta: 'Abrir mi plan',
  },
};

const postTrip: Copy = {
  fr: {
    subject: 'Comment s’est passée votre arrivée ?',
    preheader: 'Votre avis nous aide à améliorer les plans de Fuseo.',
    title: 'Comment s’est passée votre arrivée ?',
    intro: [
      'Votre voyage est terminé. Nous espérons que votre plan vous a été utile.',
      'Quelques mots de votre part nous aident à améliorer Fuseo : répondez-nous simplement depuis la page de contact.',
    ],
    cta: 'Donner mon avis',
    secondary: 'Préparer mon prochain voyage',
  },
  en: {
    subject: 'How was your arrival?',
    preheader: 'Your feedback helps us improve Fuseo plans.',
    title: 'How was your arrival?',
    intro: [
      'Your trip is over. We hope your plan was useful.',
      'A few words from you help us improve Fuseo: simply reply to us from the contact page.',
    ],
    cta: 'Share my feedback',
    secondary: 'Plan my next trip',
  },
  es: {
    subject: '¿Cómo fue su llegada?',
    preheader: 'Su opinión nos ayuda a mejorar los planes de Fuseo.',
    title: '¿Cómo fue su llegada?',
    intro: [
      'Su viaje ha terminado. Esperamos que su plan le haya sido útil.',
      'Unas palabras suyas nos ayudan a mejorar Fuseo: escríbanos desde la página de contacto.',
    ],
    cta: 'Dar mi opinión',
    secondary: 'Preparar mi próximo viaje',
  },
};

const newsletter: Copy = {
  fr: {
    subject: 'Fuseo · Du nouveau sur le blog',
    preheader: 'Sommeil, décalage horaire et chronobiologie : ce que dit la science.',
    title: 'Du nouveau sur le blog',
    intro: [
      'Sommeil, décalage horaire et chronobiologie : ce que dit la science, expliqué simplement. Chaque article cite ses sources.',
    ],
    cta: 'Voir tous les articles',
  },
  en: {
    subject: 'Fuseo · What’s new on the blog',
    preheader: 'Sleep, time zones and chronobiology: what science says.',
    title: 'What’s new on the blog',
    intro: [
      'Sleep, time zones and chronobiology: what science says, explained simply. Every article cites its sources.',
    ],
    cta: 'See all articles',
  },
  es: {
    subject: 'Fuseo · Novedades del blog',
    preheader: 'Sueño, cambio horario y cronobiología: lo que dice la ciencia.',
    title: 'Novedades del blog',
    intro: [
      'Sueño, cambio horario y cronobiología: lo que dice la ciencia, explicado con sencillez. Cada artículo cita sus fuentes.',
    ],
    cta: 'Ver todos los artículos',
  },
};

const COPY: Record<SequenceId, Copy> = {
  welcome,
  'first-plan': firstPlan,
  'pre-trip': preTrip,
  'post-trip': postTrip,
  newsletter,
};

/** Fabrique l'e-mail d'une séquence dans la langue demandée. */
export function buildNurturing(id: SequenceId, lang: Lang, v: BuildVars = {}) {
  const c = COPY[id][lang];
  const seq = SEQUENCES.find((s) => s.id === id)!;
  const campaign = `nurturing_${id.replace('-', '_')}`;
  const articles = (v.articles ?? []).slice(0, id === 'newsletter' ? 3 : id === 'pre-trip' ? 1 : 0);

  const ctaPath: Record<SequenceId, string> = {
    welcome: PATH.plan[lang],
    'first-plan': PATH.plan[lang],
    'pre-trip': PATH.account[lang],
    'post-trip': PATH.contact[lang],
    newsletter: PATH.blog[lang],
  };
  const secondary: Partial<Record<SequenceId, string>> = {
    welcome: PATH.account[lang],
    'post-trip': PATH.plan[lang],
  };

  const content: EmailContent = {
    subject: c.subject,
    preheader: c.preheader,
    title: c.title,
    // Les paragraphes sont du HTML sûr : le prénom est neutralisé avant d'être inséré.
    intro: [...(id === 'newsletter' ? [] : [esc(hello(lang, v.firstName))]), ...c.intro.map(esc)],
    steps: c.steps,
    note: c.note,
    articles: articles.map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      url: articleUrl(lang, a.slug, campaign),
      label: READ[lang],
    })),
    cta: { label: c.cta, url: url(ctaPath[id], campaign) },
    secondary:
      c.secondary && secondary[id]
        ? { label: c.secondary, url: url(secondary[id]!, campaign) }
        : undefined,
    signature: SIGN[lang],
  };
  return {
    ...renderEmail(content, {
      lang,
      email: v.email,
      unsubscribeUrl: seq.kind === 'marketing' ? v.unsubscribeUrl : undefined,
    }),
    kind: seq.kind,
  };
}
