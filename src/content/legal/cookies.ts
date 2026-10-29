import { VERSION, h, p, page, ul } from './helpers';

export default page(
  'Politique de cookies',
  VERSION,
  h("1. Qu'est-ce qu'un cookie ?"),
  p(
    "Un cookie ou traceur est un petit fichier enregistré sur votre appareil lors de la visite d'un site, ou une technologie équivalente (stockage local par exemple). Certains sont indispensables au fonctionnement du site ; d'autres, qui servent à mesurer l'audience, ne sont utilisés qu'avec votre accord.",
  ),
  h('2. Les traceurs strictement nécessaires'),
  p('Ils ne demandent pas de consentement :'),
  ul(
    "<b>Session de connexion</b> (cookie du service d'authentification Supabase) : vous maintient connecté à votre compte. Durée : celle de votre session.",
    '<b>Choix sur les cookies</b> (<b>fuseo_consent</b>) : mémorise vos choix. Durée de validité de votre choix : 6 mois ; durée maximale du cookie : 13 mois.',
  ),
  h("3. La mesure d'audience (soumise à votre accord)"),
  p(
    "Aucun traceur de mesure d'audience n'est déposé et aucune requête n'est envoyée vers Google ou Microsoft avant que vous ayez fait un choix, ni si vous refusez. Si vous acceptez :",
  ),
  ul(
    "<b>Statistiques internes Fuseo</b> (<b>fuseo_vid</b>, identifiant aléatoire, 13 mois maximum) : pages vues et événements d'usage, sans lien avec votre compte ni vos données de santé.",
    '<b>Google Analytics</b> (cookies <b>_ga</b> et <b>_ga_*</b>, 13 mois) : statistiques de fréquentation.',
    "<b>Microsoft Clarity</b> (cookies <b>_clck</b>, 1 an, et <b>_clsk</b>, 1 jour) : cartes de chaleur et analyse d'usage, jamais activé sur les pages de plan, de compte et d'administration.",
  ),
  h('4. Gérer vos choix'),
  p(
    "« Tout accepter » et « Tout refuser » vous sont proposés au même niveau, sans case pré-cochée. Refuser n'empêche ni d'utiliser le service ni de créer un compte. Vous pouvez modifier votre choix à tout moment, aussi simplement que vous l'avez donné, depuis le lien « Gérer mes cookies » du pied de page. Vous pouvez aussi supprimer les cookies depuis les réglages de votre navigateur.",
  ),
  p(
    'Le choix est redemandé au bout de 6 mois. La preuve de votre choix (identifiant aléatoire, choix, version de la politique, date ; sans adresse IP) est conservée pour répondre à nos obligations.',
  ),
  h('5. Contact'),
  p('Pour toute question : contact@fuseo.net.'),
);
