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
  ['blog.minRead', 'Lecture', M('Read', 'Lectura')],
];
