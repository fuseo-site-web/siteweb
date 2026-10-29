import { EDITOR, VERSION, h, p, page, ul } from './helpers';

export default page(
  'Politique de confidentialité',
  VERSION,
  h('1. Responsable du traitement'),
  p(
    `${EDITOR}. Contact pour toute question relative aux données personnelles : contact@fuseo.net.`,
  ),
  h('2. Les données que nous traitons et pourquoi'),
  ul(
    "<b>Compte</b> : adresse e-mail et identifiant de connexion ; si vous utilisez Google, l'adresse e-mail et le nom du compte transmis par Google. Finalité : vous identifier et sécuriser votre accès. Base légale : exécution du contrat.",
    '<b>Données de santé</b> : horaires de sommeil, profil (chronotype, âge, sommeil, caféine), réponses au questionnaire de sécurité sur la mélatonine, vols et plans calculés. Finalité : calculer et conserver vos plans. Base légale : votre consentement explicite (article 9.2.a du RGPD), recueilli séparément de toute autre acceptation et que vous pouvez retirer à tout moment.',
    "<b>Paiement et accès</b> : offre achetée, montant, identifiants de transaction Stripe, acceptation des CGV. Les données de carte bancaire sont traitées par Stripe seul. Finalité : vendre et délivrer l'accès. Base légale : contrat et obligations comptables.",
    "<b>E-mails</b> : e-mails de service (lien de connexion, confirmation d'achat) sur la base du contrat ; rappels de voyage et newsletter uniquement si vous y consentez (double confirmation pour la newsletter).",
    '<b>Contact</b> : nom, adresse e-mail et message. Finalité : répondre à votre demande. Base légale : intérêt légitime.',
    '<b>Recherche de vol</b> : le numéro de vol et la date que vous saisissez sont transmis à un fournisseur de données aériennes pour pré-remplir votre itinéraire.',
    "<b>Mesure d'audience</b> : pages vues et événements d'usage, sans propriété contenant d'information de santé ni d'e-mail ; uniquement si vous l'acceptez (voir la politique de cookies). Base légale : consentement.",
    "<b>Sécurité et prévention des abus</b> : limitation du nombre de requêtes à partir d'une empreinte non réversible de l'adresse IP et du navigateur, et vérification anti-robot. Base légale : intérêt légitime.",
  ),
  h('3. Protection de vos données de santé'),
  ul(
    "Vos données de santé sont chiffrées par l'application (AES-256-GCM) avant d'être enregistrées ; la clé est stockée séparément de la base de données.",
    "Elles ne sont lisibles que par vous, depuis votre compte. Les administrateurs de Fuseo n'y ont pas accès ; les accès exceptionnels (demande d'exercice de vos droits) sont tracés dans un journal d'audit.",
    "Les statistiques d'audience ne sont jamais reliées à votre compte ni à vos données de santé.",
    'Vous pouvez à tout moment retirer votre consentement : vos données de santé sont alors supprimées.',
  ),
  h('4. Durées de conservation'),
  ul(
    "Données de santé : 12 mois après la fin de votre dernier voyage, ou jusqu'au retrait du consentement ou à la suppression de votre compte si cela intervient avant.",
    'Compte inactif : 3 ans.',
    'Factures et pièces comptables : 10 ans.',
    'Messages de contact : 3 ans.',
    "Événements de mesure d'audience : 13 mois ; preuve de votre choix sur les cookies : 13 mois après son expiration.",
  ),
  h('5. Destinataires et sous-traitants'),
  p(
    'Vos données ne sont pas vendues. Elles sont traitées par nos sous-traitants, liés par un contrat de traitement :',
  ),
  ul(
    'Netlify (hébergement du site et des fonctions) ;',
    'Supabase (base de données et authentification), région : <span>[région UE à confirmer]</span> ;',
    'Stripe (paiement) ;',
    "Resend (envoi d'e-mails, région UE) ;",
    'Cloudflare (vérification anti-robot Turnstile) ;',
    "Google (connexion avec Google ; mesure d'audience Google Analytics si vous l'acceptez) ;",
    "Microsoft (Clarity, analyse d'usage, uniquement si vous l'acceptez, jamais sur les pages de plan, de compte et d'administration) ;",
    '<span>[fournisseur de données de vol : à confirmer]</span>.',
  ),
  p(
    "Certains de ces prestataires peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par des clauses contractuelles types de la Commission européenne ou par le Data Privacy Framework.",
  ),
  h('6. Vos droits'),
  p(
    "Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, du droit de retirer votre consentement à tout moment et du droit de définir des directives sur le sort de vos données après votre décès. Depuis votre espace, vous pouvez exporter et supprimer vos données ; vous pouvez aussi écrire à contact@fuseo.net (une pièce justificative pourra être demandée en cas de doute sur votre identité). Fuseo ne prend aucune décision individuelle automatisée produisant des effets juridiques à votre égard.",
  ),
  p('Vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr).'),
  h('7. Sécurité et violations de données'),
  p(
    "Fuseo met en œuvre des mesures techniques et organisationnelles adaptées : chiffrement en transit et au repos, cloisonnement des accès par utilisateur, authentification renforcée des administrateurs, journalisation, sauvegardes. En cas de violation susceptible d'engendrer un risque pour vos droits, la CNIL est notifiée dans les 72 heures et, si le risque est élevé, vous en êtes informé.",
  ),
  h('8. Public concerné'),
  p("Le service s'adresse aux adultes. Il n'est pas destiné aux personnes de moins de 18 ans."),
  h('9. Évolutions'),
  p(
    'Cette politique peut évoluer ; la version applicable est celle publiée sur le site, et vous êtes informé en cas de changement important.',
  ),
);
