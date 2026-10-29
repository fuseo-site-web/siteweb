import { connection } from 'next/server';
import {
  Mail,
  MailCheck,
  MailOpen,
  MousePointerClick,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { BarList, Card, Kpi, PageHead } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import { getNurturing } from '@/lib/admin/data';

export default async function Nurturing() {
  // Données du jour : jamais prérendues.
  await connection();
  const n = await getNurturing();
  const sent = n.emails.get('email.sent') ?? n.emails.get('sent') ?? 0;
  const delivered = n.emails.get('email.delivered') ?? n.emails.get('delivered') ?? 0;
  const opened = n.emails.get('email.opened') ?? n.emails.get('opened') ?? 0;
  const clicked = n.emails.get('email.clicked') ?? n.emails.get('clicked') ?? 0;
  return (
    <>
      <PageHead
        icon={Mail}
        title="Nurturing"
        lead="Le nurturing, c'est entretenir la relation avec vos contacts par e-mail pour qu'ils passent de simples curieux à clients fidèles."
      />
      <Card
        title="Qu'est-ce que le nurturing ?"
        info="Plutôt que d'envoyer un seul message, on accompagne la personne dans le temps avec des e-mails utiles, au bon moment."
        example="Léa crée un compte mais n'enregistre aucun voyage. Trois jours plus tard, elle reçoit un e-mail « Préparez votre prochain vol en 2 minutes ». Elle revient et crée son plan."
      >
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--muted)' }}>
          Les envois nécessitent le consentement de la personne (double confirmation pour la
          newsletter). Les e-mails partent via Resend avec l&apos;identité Fuseo. Cet écran suit
          l&apos;audience et les envois réels ; les scénarios automatiques (relance d&apos;un compte
          sans voyage, rappels avant un vol) ne sont pas encore activés.
        </p>
      </Card>

      <section className={styles.grid} aria-label="Abonnés à la newsletter">
        <Kpi
          icon={UserCheck}
          label="Abonnés confirmés"
          value={n.confirmed}
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
          info="Les personnes qui ont demandé la newsletter ET confirmé leur adresse par e-mail. Vous pouvez leur écrire."
          example="Léa s'inscrit, clique sur le lien de confirmation : elle devient « confirmée »."
        />
        <Kpi
          icon={Mail}
          label="En attente de confirmation"
          value={n.pending}
          chip={{ fg: '#8a5a00', bg: '#fff1cf' }}
          info="Inscrits qui n'ont pas encore cliqué sur le lien de confirmation. Ils ne reçoivent rien tant qu'ils n'ont pas confirmé."
          example="Marc s'est inscrit hier mais n'a pas ouvert l'e-mail de confirmation."
        />
        <Kpi
          icon={UserX}
          label="Désinscrits"
          value={n.unsubscribed}
          chip={{ fg: '#a1281c', bg: '#fdecea' }}
          info="Les personnes qui ne veulent plus recevoir d'e-mails. Il faut impérativement respecter ce choix."
          example="Sophie clique sur « Se désinscrire » : plus aucun envoi pour elle."
        />
      </section>

      <section className={styles.grid} aria-label="Résultats des e-mails">
        <Kpi
          icon={MailCheck}
          label="E-mails envoyés"
          value={sent}
          info="Le nombre d'e-mails partis (confirmations, liens de connexion, newsletters)."
          example="10 personnes demandent un lien de connexion : 10 e-mails envoyés."
        />
        <Kpi
          icon={MailCheck}
          label="Délivrés"
          value={delivered}
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
          info="Les e-mails bien arrivés dans la boîte du destinataire. Un écart avec les envois signale des adresses fausses ou des e-mails bloqués."
          example="10 envoyés, 9 délivrés : 1 adresse était invalide."
        />
        <Kpi
          icon={MailOpen}
          label="Ouverts"
          value={opened}
          chip={{ fg: '#6a47c4', bg: '#ece6fa' }}
          info="Les e-mails ouverts. Ce chiffre est approximatif : certaines messageries bloquent la mesure."
          example="9 délivrés, 5 ouverts : environ 55 % d'ouverture, un bon score."
        />
        <Kpi
          icon={MousePointerClick}
          label="Clics dans les e-mails"
          value={clicked}
          chip={{ fg: '#8a5a00', bg: '#fff1cf' }}
          info="Les clics sur un lien à l'intérieur d'un e-mail. C'est le meilleur signe d'intérêt."
          example="Un e-mail « Créez votre plan » : 3 personnes cliquent sur le bouton."
        />
      </section>

      <Card
        title="Qui relancer ?"
        icon={Users}
        hint="Des groupes de clients à contacter, calculés sur les comptes existants."
        info="Ces groupes montrent où se trouvent les occasions : un compte incomplet ou sans voyage est un client à aider à avancer."
        example="5 comptes sans voyage : une relance douce pourrait en convaincre 1 ou 2."
      >
        <BarList
          of={n.accounts}
          items={[
            { label: 'Comptes au total', value: n.accounts, color: '#0b2f55' },
            { label: 'Profil à compléter', value: n.incompleteProfiles, color: '#e0a21f' },
            { label: 'Compte sans voyage enregistré', value: n.noTrip, color: '#e5604d' },
            { label: 'Avec au moins un voyage', value: n.withTrip, color: '#2f9e6e' },
          ]}
          unit=" comptes"
        />
      </Card>
    </>
  );
}
