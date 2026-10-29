import { EDITOR, VERSION, h, p, page, ul } from './helpers';

export default page(
  'Conditions générales de vente',
  VERSION,
  h('1. Objet'),
  p(
    `Les présentes conditions générales de vente (« CGV ») régissent la vente en ligne des plans anti-jet lag proposés sur fuseo.net par ${EDITOR}, à toute personne physique agissant à titre personnel (« le Client »).`,
  ),
  h('2. Offres et prix'),
  ul(
    '<b>Découverte</b> : gratuite. Aperçu des premiers jours du plan, sans enregistrement obligatoire.',
    "<b>Un voyage</b> : 8,90 € TTC. Plan complet pour un voyage, c'est-à-dire un itinéraire aller et retour, escales comprises, avec export PDF et rappels d'agenda. Les horaires et escales de ce même voyage peuvent être modifiés et le plan recalculé sans frais ; un changement de destination constitue un nouveau voyage.",
    '<b>Grand voyageur</b> : 79,90 € TTC. Plans complets pour vos voyages personnels, en nombre illimité pendant 12 mois à compter du paiement, sans reconduction automatique.',
  ),
  p(
    'Les prix sont indiqués en euros, toutes taxes comprises. Le prix applicable est celui affiché au moment de la commande.',
  ),
  h('3. Commande et paiement'),
  p(
    "La commande suppose la création d'un compte ou la connexion à celui-ci. Le paiement s'effectue en ligne, en une fois, par l'intermédiaire de la plateforme sécurisée Stripe ; Fuseo n'a jamais accès aux numéros de carte bancaire. La commande est confirmée par un e-mail adressé à l'adresse du compte, accompagné d'un reçu.",
  ),
  h('4. Accès au plan'),
  p(
    "L'accès au plan complet est activé sur le compte du Client dès que Stripe confirme le paiement, puis disponible sur tous ses appareils après connexion. Une redirection vers le site après le paiement ne suffit pas à débloquer l'accès : seule la confirmation du paiement par Stripe le fait. En cas de difficulté d'accès, le Client peut écrire à contact@fuseo.net en joignant son reçu.",
  ),
  h('5. Droit de rétractation'),
  p(
    "Le plan complet est un contenu numérique non fourni sur un support matériel, dont l'exécution commence immédiatement après le paiement. Conformément à l'article L221-28, 13° du Code de la consommation, le Client demande expressément l'exécution immédiate et renonce à son droit de rétractation en cochant la case prévue à cet effet avant le paiement. Cette acceptation est horodatée et conservée avec la commande.",
  ),
  h('6. Remboursement, litige et révocation'),
  p(
    "En cas de remboursement ou de contestation du paiement auprès de la banque, l'accès au plan correspondant peut être suspendu ou révoqué.",
  ),
  h("7. Codes d'accès"),
  p(
    "Des codes d'accès promotionnels ou destinés à des testeurs peuvent être délivrés par Fuseo. Ils sont personnels, limités en nombre d'utilisations et dans le temps, et n'ouvrent droit à aucune contrepartie financière.",
  ),
  h('8. Garanties légales'),
  p(
    "Le Client bénéficie de la garantie légale de conformité applicable aux contenus numériques (articles L224-25-1 et suivants du Code de la consommation). Fuseo s'engage à fournir un service conforme à sa description.",
  ),
  h('9. Nature du service et responsabilité'),
  p(
    "Les plans sont des conseils généraux d'hygiène de vie et de chronobiologie, non médicaux, soumis aux avertissements des CGU. La responsabilité de Fuseo ne peut être engagée en cas d'informations inexactes saisies par le Client, de modification des horaires de vol ou d'utilisation contraire aux avertissements, sans préjudice des droits impératifs du consommateur.",
  ),
  h('10. Données personnelles'),
  p(
    'Les données traitées pour la commande sont décrites dans la politique de confidentialité. Les informations de facturation sont conservées pendant la durée imposée par les obligations comptables.',
  ),
  h('11. Réclamations et médiation'),
  p(
    'Toute réclamation peut être adressée à contact@fuseo.net. Conformément aux articles L611-1 et suivants du Code de la consommation, le Client peut ensuite recourir gratuitement au médiateur de la consommation suivant : <span>[nom et coordonnées du médiateur à compléter]</span>.',
  ),
  h('12. Droit applicable'),
  p(
    "Les CGV sont soumises au droit français. Elles s'appliquent à compter de l'ouverture du paiement en ligne.",
  ),
);
