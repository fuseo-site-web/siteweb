import { BookOpen } from 'lucide-react';
import { Card, PageHead } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';

const TERMS: Array<[string, string, string]> = [
  [
    'Visiteur',
    'Une personne (en réalité un appareil) qui vient sur le site, comptée une seule fois même si elle revient.',
    'Léa vient 3 fois : 1 visiteur.',
  ],
  [
    'Visite (ou session)',
    "Une série de pages consultées d'affilée, jusqu'à ce que la personne quitte ou reste inactive.",
    'Léa lit 3 pages à la suite : 1 visite.',
  ],
  [
    'Page vue',
    'Une page affichée à l’écran. Recharger une page la compte de nouveau.',
    '3 pages lues = 3 pages vues.',
  ],
  ['Clic', 'Un appui sur un lien ou un bouton du site.', '« Créer mon plan » cliqué : 1 clic.'],
  [
    'Canal',
    "La grande famille d'origine d'une visite : moteur de recherche, assistant IA, réseau social, e-mail, direct…",
    'Google appartient au canal « Moteurs de recherche ».',
  ],
  [
    'Source',
    "Le site précis d'où vient la visite à l'intérieur d'un canal.",
    'ChatGPT est une source du canal « Assistants IA ».',
  ],
  [
    'Accès direct',
    'Visite sans origine connue : adresse tapée, favori, ou lien reçu par messagerie.',
    'Un ami vous envoie l’adresse par SMS.',
  ],
  [
    'SEO',
    'Le référencement naturel : faire en sorte que Google (et les autres) montrent le site dans leurs résultats, sans payer.',
    'Un article bien écrit sur le jet lag apparaît dans Google.',
  ],
  [
    'Page d’entrée',
    "La première page qu'une personne voit en arrivant sur le site.",
    'Un article de blog trouvé sur Google.',
  ],
  [
    'Taux de clic',
    'Le nombre de clics divisé par le nombre de pages vues, en pourcentage.',
    '25 clics pour 100 pages vues : 25 %.',
  ],
  [
    'Lead',
    "Une personne qui s'intéresse à Fuseo et qu'il faut recontacter (rendez-vous, Fuseo Pro).",
    'Une entreprise demande une démonstration.',
  ],
  [
    'Nurturing',
    "Entretenir la relation par e-mail avec des messages utiles et espacés pour amener un contact vers l'achat.",
    'Un e-mail de conseils trois jours après l’inscription.',
  ],
  [
    'Consentement',
    "L'accord du visiteur pour être mesuré (cookies). Sans accord, il n'est pas compté.",
    'Un visiteur clique « Tout refuser » : il ne figure pas dans les statistiques.',
  ],
  [
    'Données de santé',
    "Informations de sommeil et de voyage d'un client. Elles sont chiffrées : personne, pas même vous, ne peut les lire ici.",
    'Les horaires de vol d’un client sont enregistrés chiffrés.',
  ],
  [
    'WebP',
    "Un format d'image moderne, léger et rapide à charger : il améliore la vitesse du site et donc le référencement.",
    'Une photo de 2 Mo devient environ 200 Ko.',
  ],
  [
    'Brouillon / Publié',
    "Un article « brouillon » n'est visible que de vous. « Publié » le rend public sur le blog et dans Google.",
    'Vous rédigez le lundi (brouillon), publiez le mercredi.',
  ],
];

export default function Help() {
  return (
    <>
      <PageHead
        icon={BookOpen}
        title="Aide & glossaire"
        lead="Les mots utilisés dans cet espace, expliqués simplement avec un exemple. Les (i) répartis dans les pages donnent la même aide au bon endroit."
      />
      <div className={styles.grid2}>
        {TERMS.map(([term, def, ex]) => (
          <section key={term} className={styles.card}>
            <h2>{term}</h2>
            <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{def}</p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5 }}>
              <b>Exemple :</b> {ex}
            </p>
          </section>
        ))}
      </div>
      <Card
        title="Bon à savoir sur les chiffres"
        info="Les chiffres d'audience sont toujours une partie du trafic réel : ils ne comptent que les visiteurs qui acceptent les cookies. Les chiffres de comptes, de voyages et de demandes, eux, sont exacts car ils viennent directement de la base."
      >
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Pour une lecture fiable, comparez des périodes entre elles (par exemple 7 jours contre les
          7 jours précédents) plutôt que de regarder une valeur seule. Le taux d&apos;acceptation
          des cookies est affiché dans « Santé & réglages ».
        </p>
      </Card>
    </>
  );
}
