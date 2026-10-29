import { EDITOR, VERSION, h, p, page, ul } from './helpers';

export default page(
  "Conditions générales d'utilisation",
  VERSION,
  h('1. Objet'),
  p(
    `Les présentes conditions générales d'utilisation (« CGU ») définissent les règles d'accès et d'utilisation du site fuseo.net et du service Fuseo, édités par ${EDITOR}. En utilisant le site ou en créant un compte, vous acceptez les CGU.`,
  ),
  h('2. Le service'),
  p(
    'Fuseo calcule, à partir des horaires de sommeil et des vols que vous saisissez, un plan jour par jour : heures de sommeil, moments où chercher ou éviter la lumière, siestes, arrêt de la caféine et, en option, mélatonine. Une partie du plan est affichée gratuitement ; le plan complet est accessible selon les conditions des CGV.',
  ),
  h("3. Un service d'information, pas un acte médical"),
  p(
    "Fuseo fournit des informations et des conseils généraux sur le sommeil et la chronobiologie du voyage. Le service ne constitue ni une consultation, ni un diagnostic, ni un traitement, et ne remplace pas l'avis d'un professionnel de santé. Fuseo n'est pas un dispositif médical.",
  ),
  ul(
    "Le service s'adresse aux adultes en bonne santé.",
    "En cas de grossesse, d'allaitement, de maladie chronique, de trouble bipolaire, de maladie des yeux, d'épilepsie ou de traitement en cours, demandez l'avis de votre médecin avant de suivre un plan.",
    'La mélatonine et tout médicament ne doivent être pris que sur avis médical ; Fuseo ne recommande jamais de somnifère.',
    'Les estimations de vigilance sont des prédictions relatives, pas une mesure médicale ni une aptitude à conduire : ne conduisez pas si vous êtes somnolent.',
  ),
  h('4. Compte utilisateur'),
  p(
    'Un compte est nécessaire pour enregistrer vos plans et vos informations, et pour accéder à un plan acheté. Vous pouvez vous connecter par lien envoyé à votre adresse e-mail ou avec votre compte Google. Vous êtes responsable de la confidentialité de vos moyens de connexion et des actions réalisées depuis votre compte ; informez-nous sans délai de toute utilisation non autorisée à contact@fuseo.net.',
  ),
  p(
    'Vous vous engagez à fournir des informations exactes. Un compte est personnel et ne peut pas être cédé.',
  ),
  h('5. Utilisation conforme'),
  p('Il est interdit :'),
  ul(
    "d'utiliser le service pour un usage illicite, ou d'en perturber le fonctionnement (tentative d'intrusion, surcharge, contournement de limites d'usage ou de l'accès au plan complet) ;",
    "d'extraire de façon automatisée le contenu du site, les plans ou le moteur de calcul, ou de les reproduire pour les revendre ;",
    'de saisir des données concernant une autre personne sans son accord.',
  ),
  p(
    "Fuseo peut suspendre ou supprimer un compte en cas de manquement grave, après en avoir informé l'utilisateur sauf urgence.",
  ),
  h('6. Exactitude des informations saisies'),
  p(
    "La qualité d'un plan dépend de l'exactitude des horaires de sommeil et de vol saisis. Les horaires de vol pouvant changer, vérifiez-les auprès de votre compagnie ; vous pouvez recalculer votre plan en cas de changement.",
  ),
  h('7. Disponibilité'),
  p(
    "Fuseo met en œuvre les moyens raisonnables pour assurer l'accès au service, sans garantie de disponibilité continue : des interruptions de maintenance ou dues à des tiers (hébergeur, fournisseurs) sont possibles.",
  ),
  h('8. Propriété intellectuelle'),
  p(
    "Le site, son contenu (textes, graphismes, logo, frises, plans), le moteur de calcul et le code sont la propriété de SLEEPTECHNOLOGY ou utilisés avec autorisation. Vous disposez d'un droit personnel, non exclusif et non transférable d'utiliser le service et d'utiliser vos plans pour votre usage personnel. Toute autre reproduction ou exploitation est interdite sans autorisation écrite.",
  ),
  h('9. Responsabilité'),
  p(
    "Fuseo est tenu d'une obligation de moyens. Fuseo ne peut être tenu responsable d'un usage du service contraire aux CGU et aux avertissements ci-dessus, d'informations inexactes saisies par l'utilisateur, d'un changement d'horaires de vol, ni des effets d'un traitement ou d'une substance pris sans avis médical. Ces stipulations ne limitent pas les droits que la loi reconnaît impérativement aux consommateurs.",
  ),
  h('10. Données personnelles et cookies'),
  p(
    "Le traitement de vos données, y compris vos données de santé, est décrit dans la politique de confidentialité, et l'usage des cookies dans la politique de cookies.",
  ),
  h('11. Modification des CGU'),
  p(
    "Fuseo peut modifier les CGU, notamment pour tenir compte d'évolutions du service ou de la loi. La version applicable est celle publiée sur le site à la date d'utilisation ; en cas de modification substantielle, les utilisateurs titulaires d'un compte en sont informés.",
  ),
  h('12. Droit applicable et contact'),
  p(
    'Les CGU sont soumises au droit français. Pour toute question : contact@fuseo.net. Le consommateur peut recourir à la médiation de la consommation dans les conditions prévues par les CGV.',
  ),
);
