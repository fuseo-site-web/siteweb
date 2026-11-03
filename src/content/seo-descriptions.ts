import type { StaticPathname } from '@/i18n/routing';

/**
 * Meta descriptions rédigées pour Google (140 à 155 caractères), par page et par langue.
 * Elles remplacent le chapô de la page quand celui-ci est trop court ou serait coupé.
 * Un test e2e vérifie la longueur de toutes les pages du sitemap.
 */
export const PAGE_DESCRIPTIONS: Partial<Record<StaticPathname, Partial<Record<string, string>>>> = {
  '/': {
    fr: "Entrez vos horaires de vol : Fuseo calcule quand dormir, chercher la lumière et arrêter la caféine pour vous adapter au fuseau d'arrivée. Essai gratuit.",
    en: 'Enter your flight times: Fuseo works out when to sleep, seek light and stop caffeine so you adapt to your arrival time zone. Try your plan for free.',
    es: 'Introduzca sus horarios de vuelo: Fuseo calcula cuándo dormir, buscar la luz y dejar la cafeína para adaptarse a la zona horaria de llegada. Gratis.',
  },
  '/blog': {
    fr: 'Sommeil, décalage horaire et chronobiologie : ce que dit la science, expliqué simplement. Chaque article cite ses sources. Lisez nos derniers conseils.',
    en: 'Sleep, jet lag and chronobiology: what the science says, explained simply. Every article cites its sources. Read our latest tips before your next trip.',
    es: 'Sueño, desfase horario y cronobiología: lo que dice la ciencia, explicado de forma sencilla. Cada artículo cita sus fuentes. Lea nuestros últimos consejos.',
  },
  '/contact': {
    fr: "Une question, une demande de rendez-vous ou un projet pour votre entreprise ? Écrivez-nous, nous vous répondons rapidement. Contactez l'équipe Fuseo.",
    en: 'A question, an appointment request or a project for your company? Write to us and we will reply quickly. Get in touch with the Fuseo team today.',
    es: '¿Una pregunta, una solicitud de cita o un proyecto para su empresa? Escríbanos y le responderemos pronto. Póngase en contacto con el equipo de Fuseo.',
  },
  '/equipement': {
    fr: "Ce qui peut aider à suivre votre plan quand la lumière ou le calme manquent. Aucun de ces équipements n'est indispensable : voici nos conseils de voyage.",
    en: 'What can help you follow your plan when light or quiet are lacking. None of this equipment is essential: here is our travel gear advice for better sleep.',
    es: 'Lo que puede ayudarle a seguir su plan cuando falta luz o tranquilidad. Ninguno de estos equipos es imprescindible: estos son nuestros consejos de viaje.',
  },
  '/pro': {
    fr: "La chronobiologie pour ceux qui voyagent beaucoup : entreprises, clubs sportifs, navigants et agences. Découvrez l'offre Fuseo Pro et contactez-nous.",
    en: 'Chronobiology for people who travel a lot: companies, sports clubs, flight crews and travel agencies. Discover the Fuseo Pro offer and get in touch.',
    es: 'La cronobiología para quienes viajan mucho: empresas, clubes deportivos, tripulaciones y agencias. Descubra la oferta Fuseo Pro y póngase en contacto.',
  },
  '/methode': {
    en: 'A chronobiology engine that considers your sleep, flights and light exposure to build a plan tailored to your trip. See how the calculation works.',
    es: 'Un motor de cronobiología que tiene en cuenta tu sueño, tus vuelos y la luz para crear un plan adaptado a tu viaje. Descubre cómo funciona el cálculo.',
  },
  '/tarifs': {
    fr: "Commencez gratuitement : les premiers jours de votre plan s'affichent sans rien payer. Vous ne payez que si vous voulez le plan complet. Voir les offres.",
    en: 'Start for free: the first days of your plan are shown without paying anything. You only pay if you want the full plan. Compare our offers and pick yours.',
    es: 'Empiece gratis: los primeros días de su plan se muestran sin pagar nada. Solo paga si quiere el plan completo. Compare nuestras ofertas y elija la suya.',
  },
  '/plan': {
    fr: 'Indiquez vos nuits et vos vols : Fuseo calcule votre plan jour par jour, pour dormir et chercher la lumière au bon moment. Essayez-le gratuitement.',
    en: 'Enter your nights and flights: Fuseo calculates your plan day by day, so you sleep and seek light at the right time. Try it for free, no sign-up needed.',
    es: 'Indique sus noches y sus vuelos: Fuseo calcula su plan día a día, para dormir y buscar la luz en el momento adecuado. Pruébelo gratis, sin registrarse.',
  },
  '/plan-du-site': {
    fr: "Toutes les pages de Fuseo au même endroit : la science du jet lag, notre méthode, l'équipe médicale, les tarifs et le blog. Trouvez ce qu'il vous faut.",
    en: 'All Fuseo pages in one place: the science of jet lag, our method, the medical team, pricing and the blog. Find what you need to prepare your trip.',
    es: 'Todas las páginas de Fuseo en un solo lugar: la ciencia del jet lag, nuestro método, el equipo médico, los precios y el blog. Encuentre lo que necesita.',
  },
  '/sources': {
    fr: "Les recommandations de Fuseo s'appuient sur des publications scientifiques sur le sommeil et le jet lag. Consultez la liste complète des références.",
    en: "Fuseo's recommendations are based on scientific publications on sleep and jet lag. Browse the full list of references behind every plan we calculate.",
    es: 'Las recomendaciones de Fuseo se basan en publicaciones científicas sobre el sueño y el jet lag. Consulte la lista completa de nuestras referencias.',
  },
  '/equipe': {
    fr: "Une expertise médicale en sommeil et chronobiologie, désormais accessible à tous les voyageurs. Découvrez les médecins et l'histoire de Fuseo.",
    en: 'Expertise in sleep medicine and chronobiology, now accessible to all travelers. Meet the doctors behind Fuseo and discover how the project began.',
    es: 'Experiencia en medicina del sueño y cronobiología, ahora al alcance de todos los viajeros. Conozca a los médicos detrás de Fuseo y su historia.',
  },
  '/la-science': {
    fr: "Le jet lag n'est ni un manque de volonté ni une simple fatigue de voyage. Comprenez ce qui dérègle votre horloge interne et comment la recaler.",
  },
  '/transparence': {
    fr: "Fuseo est financé par la vente des plans complets. Le site n'affiche aucune publicité et votre plan ne dépend d'aucun partenaire. Lisez nos engagements.",
    en: 'Fuseo is funded by the sale of full plans. The site displays no advertising and your plan depends on no commercial partner. Read our commitments.',
    es: 'Fuseo se financia con la venta de los planes completos. El sitio no muestra publicidad y su plan no depende de ningún socio. Conozca nuestros compromisos.',
  },
  '/cookies': {
    en: 'Which cookies and trackers Fuseo uses, what they are for, how long they last and how to change your choices. The French version prevails; under review.',
    es: 'Qué cookies y rastreadores usa Fuseo, para qué sirven, cuánto duran y cómo cambiar sus elecciones. Prevalece la versión francesa; en proceso de revisión.',
  },
  '/confidentialite': {
    en: 'How Fuseo collects and protects your personal and health data, why we process it, how long we keep it and your rights. The French version prevails.',
    es: 'Cómo recoge y protege Fuseo sus datos personales y de salud, por qué los trata, cuánto los conserva y sus derechos. Prevalece la versión francesa.',
  },
  '/cgu': {
    en: 'The rules for accessing and using the Fuseo website and service, an information service and not medical advice. The French version prevails; under review.',
    es: 'Las normas de acceso y uso del sitio y del servicio de Fuseo, un servicio de información y no un acto médico. Prevalece la versión francesa; en revisión.',
  },
  '/cgv': {
    en: 'The terms of sale of Fuseo anti-jet lag plans: offers and prices, payment, access to your plan, withdrawal and refunds. The French version prevails.',
    es: 'Las condiciones de venta de los planes antijet lag de Fuseo: ofertas y precios, pago, acceso, desistimiento y reembolsos. Prevalece la versión francesa.',
  },
  '/accessibilite': {
    en: "Fuseo's commitment to digital accessibility, its current compliance status, known limits and how to report a problem. The French version prevails.",
    es: 'El compromiso de Fuseo con la accesibilidad digital, su estado de conformidad, sus límites y cómo comunicar un problema. Prevalece la versión francesa.',
  },
};

/** Même chose pour les articles intégrés au site, par identifiant d'article (commun aux trois langues). */
export const POST_DESCRIPTIONS: Record<string, Partial<Record<string, string>>> = {
  'jet-lag-est-ouest': {
    fr: "Paris–New York se digère souvent mieux que New York–Paris : voyager vers l'est oblige l'horloge interne à avancer. Comprenez pourquoi et comment l'aider.",
    en: 'Paris–New York is often easier than New York–Paris: flying east forces your internal clock to advance. Find out why, and how light at the right time helps.',
    es: 'Un París–Nueva York suele llevarse mejor que un Nueva York–París: viajar al este obliga al reloj interno a adelantarse. Descubra por qué y cómo ayudarlo.',
  },
  'lumiere-horloge-biologique': {
    fr: "Aucun complément ni aucune astuce ne recale l'horloge interne aussi puissamment que la lumière, à condition de la recevoir au bon moment. Mode d'emploi.",
    en: 'No supplement or trick resets the internal clock as powerfully as light, provided you get it at the right time. Here is how to use it against jet lag.',
    es: 'Ningún suplemento ni truco ajusta el reloj interno con tanta fuerza como la luz, siempre que la reciba en el momento adecuado. Aprenda a usarla.',
  },
  'melatonine-jet-lag': {
    fr: 'La mélatonine est le complément le plus cité contre le jet lag. Ce que disent les études, dans quels cas elle peut aider et les précautions à connaître.',
    en: 'Melatonin is the supplement most often mentioned for jet lag. See what the studies say, when it can help and the precautions you should know about.',
    es: 'La melatonina es el suplemento más citado contra el jet lag. Vea qué dicen los estudios, cuándo puede ayudar y qué precauciones conviene conocer.',
  },
  'dormir-en-avion': {
    fr: "Dormir à bord n'est utile que si c'est au bon moment, et certains réflexes courants font plus de mal que de bien. Voici ce qui aide vraiment en vol.",
    en: 'Sleeping on board is only useful at the right time, and some common habits do more harm than good. Find out what really helps before your next flight.',
    es: 'Dormir a bordo solo sirve si es en el momento adecuado, y algunos reflejos habituales hacen más mal que bien. Esto es lo que realmente ayuda en vuelo.',
  },
  'cafeine-sieste-premier-jour': {
    fr: "Le jour d'arrivée, un café bien placé et une sieste courte aident à tenir jusqu'au soir. Mal utilisés, ils sabotent la première nuit : voici comment faire.",
    en: 'On arrival day, a well-timed coffee and a short nap help you last until the evening. Used badly, they sabotage the first night. Here is how to use them.',
    es: 'El día de la llegada, un café bien situado y una siesta corta ayudan a aguantar hasta la noche. Mal usados, sabotean la primera noche: así se usan bien.',
  },
  'preparer-horloge-avant-depart': {
    fr: "Le jet lag peut se traiter avant même de monter dans l'avion, en décalant progressivement son sommeil les jours précédents. Voici comment faire.",
    en: 'Jet lag can be treated before you even board the plane, by gradually shifting your sleep in the days before. Here is how to prepare your internal clock.',
    es: 'El jet lag puede tratarse antes incluso de subir al avión, desplazando progresivamente el sueño los días anteriores. Así puede preparar su reloj interno.',
  },
};
