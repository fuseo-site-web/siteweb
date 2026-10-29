import { EDITOR, VERSION, h, p, page, ul } from './helpers';

export default page(
  "Déclaration d'accessibilité",
  VERSION,
  h('1. Notre engagement'),
  p(
    `${EDITOR}, s'efforce de rendre le site fuseo.net accessible au plus grand nombre, y compris aux personnes en situation de handicap, en visant le niveau AA des règles WCAG 2.2 et du référentiel RGAA.`,
  ),
  h('2. État de conformité'),
  p(
    "Le site n'a pas encore fait l'objet d'un audit de conformité RGAA réalisé par un organisme indépendant : son niveau de conformité n'est donc pas évalué à ce jour.",
  ),
  p('Mesures déjà en place :'),
  ul(
    "tests automatisés d'accessibilité (axe-core, critères WCAG 2.x A et AA) exécutés sur les pages principales à chaque version ;",
    "navigation au clavier, lien d'évitement vers le contenu, focus visible, structure de titres, textes alternatifs et libellés de formulaires ;",
    'respect de la préférence « réduction des animations » du système, et thèmes clair et sombre contrastés ;',
    'contenu lisible sans JavaScript pour les pages de contenu.',
  ),
  h('3. Limites connues'),
  p(
    "Le planificateur de voyage (formulaire et frises) est une interface riche dont l'accessibilité complète au lecteur d'écran fait l'objet de tests spécifiques ; certaines représentations graphiques peuvent être moins pratiques sans la vue. Chaque information importante y est aussi restituée sous forme de liste de textes.",
  ),
  h('4. Signaler un problème'),
  p(
    'Si vous ne parvenez pas à accéder à un contenu ou à une fonctionnalité, écrivez à contact@fuseo.net en indiquant la page concernée et votre difficulté : nous répondons sous 48 heures ouvrées et vous proposons une alternative accessible.',
  ),
  h('5. Voies de recours'),
  p(
    "Si vous n'obtenez pas de réponse satisfaisante, vous pouvez saisir le Défenseur des droits : formulaire en ligne sur defenseurdesdroits.fr, ou courrier gratuit sans affranchissement à Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07.",
  ),
);
