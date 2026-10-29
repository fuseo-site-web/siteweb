// Textes d'interface communs au site (fil d'Ariane, sommaire, maillage) et du blog (recherche, pagination).
const M = (en, es) => ({ en, es });
module.exports = [
  ['common.breadcrumb', "Fil d'Ariane", M('Breadcrumb', 'Ruta de navegación')],
  ['common.toc', 'Dans cette page', M('On this page', 'En esta página')],
  ['common.related', 'Pour aller plus loin', M('Keep exploring', 'Para ir más lejos')],
  ['blog.search', 'Rechercher un article', M('Search articles', 'Buscar un artículo')],
  [
    'blog.searchPh',
    'Lumière, mélatonine, avion, caféine…',
    M('Light, melatonin, flying, caffeine…', 'Luz, melatonina, avión, cafeína…'),
  ],
  ['blog.clear', 'Effacer la recherche', M('Clear search', 'Borrar la búsqueda')],
  ['blog.topics', 'Thèmes', M('Topics', 'Temas')],
  ['blog.all', 'Tous', M('All', 'Todos')],
  [
    'blog.results',
    '{n, plural, =0 {Aucun article} one {# article} other {# articles}}',
    M(
      '{n, plural, =0 {No articles} one {# article} other {# articles}}',
      '{n, plural, =0 {Ningún artículo} one {# artículo} other {# artículos}}',
    ),
  ],
  [
    'blog.noResults',
    'Aucun article ne correspond à « {q} ». Essayez un autre mot-clé ou un autre thème.',
    M(
      'No article matches “{q}”. Try another keyword or topic.',
      'Ningún artículo coincide con «{q}». Pruebe otra palabra clave u otro tema.',
    ),
  ],
  [
    'blog.pagination',
    'Pagination des articles',
    M('Article pagination', 'Paginación de artículos'),
  ],
  ['blog.prev', 'Précédent', M('Previous', 'Anterior')],
  ['blog.next', 'Suivant', M('Next', 'Siguiente')],
  ['blog.pageOf', 'Page {n} sur {total}', M('Page {n} of {total}', 'Página {n} de {total}')],
  ['blog.related', 'À lire aussi', M('Related reading', 'Te puede interesar')],
  [
    'consent.title',
    'Votre vie privée, votre choix',
    M('Your privacy, your choice', 'Su privacidad, su decisión'),
  ],
  [
    'consent.body',
    "Avec votre accord, nous mesurons l'audience du site (Google Analytics, Microsoft Clarity) pour l'améliorer. Rien n'est déposé avant votre choix, et refuser n'empêche rien.",
    M(
      'With your consent, we measure site traffic (Google Analytics, Microsoft Clarity) to improve it. Nothing is stored before you choose, and declining blocks nothing.',
      'Con su acuerdo, medimos la audiencia del sitio (Google Analytics, Microsoft Clarity) para mejorarlo. No se guarda nada antes de su elección, y rechazar no impide nada.',
    ),
  ],
  ['consent.more', 'En savoir plus', M('Learn more', 'Más información')],
  ['consent.acceptAll', 'Tout accepter', M('Accept all', 'Aceptar todo')],
  ['consent.refuseAll', 'Tout refuser', M('Reject all', 'Rechazar todo')],
  ['consent.customize', 'Personnaliser', M('Customise', 'Personalizar')],
  ['consent.save', 'Enregistrer mon choix', M('Save my choice', 'Guardar mi elección')],
  ['consent.close', 'Fermer sans changer', M('Close without changes', 'Cerrar sin cambios')],
  ['consent.manage', 'Gérer mes cookies', M('Manage cookies', 'Gestionar cookies')],
  ['consent.necessary', 'Nécessaires', M('Necessary', 'Necesarias')],
  [
    'consent.necessaryDesc',
    'Session de connexion et mémorisation de votre choix.',
    M('Sign-in session and remembering your choice.', 'Sesión de acceso y memoria de su elección.'),
  ],
  ['consent.always', 'Toujours actifs', M('Always on', 'Siempre activas')],
  ['consent.analytics', "Mesure d'audience", M('Audience measurement', 'Medición de audiencia')],
  [
    'consent.analyticsDesc',
    "Google Analytics et Microsoft Clarity. Clarity n'est jamais activé sur les pages de plan et de compte.",
    M(
      'Google Analytics and Microsoft Clarity. Clarity is never active on plan and account pages.',
      'Google Analytics y Microsoft Clarity. Clarity nunca se activa en las páginas de plan y de cuenta.',
    ),
  ],
  ['onboarding.eyebrow', 'Bienvenue à bord', M('Welcome aboard', 'Bienvenido a bordo')],
  [
    'onboarding.title',
    'Bienvenue chez Fuseo, faisons connaissance',
    M('Welcome to Fuseo, let’s get acquainted', 'Bienvenido a Fuseo, nos presentamos'),
  ],
  [
    'onboarding.lead',
    'Votre espace est prêt. Avant votre premier vol, dites-nous quelques mots sur vous : nous préparerons vos plans anti-jet lag à partir de ces informations.',
    M(
      'Your space is ready. Before your first flight, tell us a little about yourself: we will build your anti-jet-lag plans from these details.',
      'Su espacio está listo. Antes de su primer vuelo, cuéntenos algo sobre usted: prepararemos sus planes antijet lag a partir de estos datos.',
    ),
  ],
  [
    'onboarding.b1Title',
    'Vos voyages, vos billets',
    M('Your trips, your tickets', 'Sus viajes, sus billetes'),
  ],
  [
    'onboarding.b1Text',
    'Retrouvez vos voyages enregistrés, à venir et passés, sur tous vos appareils.',
    M(
      'Find your saved trips, upcoming and past, on all your devices.',
      'Encuentre sus viajes guardados, próximos y pasados, en todos sus dispositivos.',
    ),
  ],
  ['onboarding.b2Title', 'Gain de temps', M('Save time', 'Ahorre tiempo')],
  [
    'onboarding.b2Text',
    'Votre aéroport habituel est proposé dès que vous créez un plan.',
    M(
      'Your usual airport is suggested as soon as you create a plan.',
      'Su aeropuerto habitual se propone en cuanto crea un plan.',
    ),
  ],
  ['onboarding.b3Title', 'Vie privée', M('Privacy', 'Privacidad')],
  [
    'onboarding.b3Text',
    'Ces informations restent privées : elles servent uniquement à personnaliser votre espace.',
    M(
      'These details stay private: they are only used to personalise your space.',
      'Estos datos son privados: solo sirven para personalizar su espacio.',
    ),
  ],
  ['onboarding.formTitle', 'Vos informations', M('Your details', 'Sus datos')],
  [
    'onboarding.formNote',
    'Tous les champs sont nécessaires pour accéder à votre espace.',
    M(
      'All fields are required to enter your space.',
      'Todos los campos son necesarios para acceder a su espacio.',
    ),
  ],
  ['onboarding.cta', 'Accéder à mon espace', M('Go to my space', 'Acceder a mi espacio')],
  ['onboarding.saving', 'Enregistrement…', M('Saving…', 'Guardando…')],
  [
    'onboarding.missing',
    'Merci de renseigner tous les champs, avec un aéroport et une date de naissance valides.',
    M(
      'Please fill in every field, with a valid airport and date of birth.',
      'Rellene todos los campos, con un aeropuerto y una fecha de nacimiento válidos.',
    ),
  ],
  ['blog.minRead', 'Lecture', M('Read', 'Lectura')],
];
