import { connection } from 'next/server';
import {
  Eye,
  FileText,
  Inbox,
  LayoutDashboard,
  MousePointerClick,
  Plane,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { LineChart } from '@/components/admin/Charts';
import { channelColor, channelName } from '@/components/admin/colors';
import { BarList, Card, Kpi, PageHead, Period } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import {
  getBusiness,
  getConsentRate,
  getDaily,
  getKpis,
  getSources,
  resolvePeriod,
} from '@/lib/admin/data';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  // Données du jour : jamais prérendues.
  await connection();
  const p = resolvePeriod((await searchParams).p);
  const [cur, prev, daily, sources, biz, consent] = await Promise.all([
    getKpis(p.from, p.to),
    getKpis(p.prevFrom, p.prevTo),
    getDaily(p),
    getSources(p),
    getBusiness(),
    getConsentRate(),
  ]);

  const byChannel = new Map<string, number>();
  for (const s of sources) byChannel.set(s.channel, (byChannel.get(s.channel) ?? 0) + s.sessions);

  return (
    <>
      <PageHead
        icon={LayoutDashboard}
        title="Tableau de bord"
        lead={`Vue d'ensemble de l'activité de Fuseo sur les ${p.days} derniers jours : qui visite le site, d'où viennent les visiteurs et ce qu'il y a à traiter.`}
      >
        <Period base="/admin" current={p.days} />
      </PageHead>

      {consent.rate !== null ? (
        <p className={styles.card} style={{ margin: 0, padding: '12px 16px', fontSize: 14 }}>
          <b>À savoir :</b> seuls les visiteurs qui acceptent les cookies sont comptés.
          Aujourd&apos;hui, <b>{consent.rate} %</b> d&apos;entre eux acceptent ({consent.accepted}{' '}
          sur {consent.total} ayant fait un choix). Le trafic réel est donc plus élevé que les
          chiffres ci-dessous.
        </p>
      ) : null}

      <section className={styles.grid} aria-label="Indicateurs d'audience">
        <Kpi
          icon={Users}
          label="Visiteurs"
          value={cur.visitors}
          previous={prev.visitors}
          spark={daily.visitors}
          info="Le nombre de personnes différentes (plus exactement d'appareils) venues sur le site. Une personne qui revient plusieurs fois compte une seule fois."
          example="Léa vient 3 fois dans le mois : elle compte pour 1 visiteur mais pour 3 visites."
        />
        <Kpi
          icon={Eye}
          label="Visites"
          value={cur.sessions}
          previous={prev.sessions}
          spark={daily.sessions}
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
          info="Une visite, c'est une série de pages consultées d'affilée. Elle se termine quand la personne quitte le site ou reste inactive."
          example="Léa arrive depuis Google, lit 3 pages puis repart : c'est 1 visite et 3 pages vues."
        />
        <Kpi
          icon={FileText}
          label="Pages vues"
          value={cur.pageViews}
          previous={prev.pageViews}
          spark={daily.pageViews}
          chip={{ fg: '#6a47c4', bg: '#ece6fa' }}
          info="Le nombre total de pages affichées. Si une personne recharge ou rouvre une page, elle est comptée de nouveau."
          example="100 visites avec en moyenne 2,5 pages chacune font 250 pages vues."
        />
        <Kpi
          icon={MousePointerClick}
          label="Clics"
          value={cur.clicks}
          previous={prev.clicks}
          spark={daily.clicks}
          chip={{ fg: '#8a5a00', bg: '#fff1cf' }}
          info="Le nombre de clics sur des liens et des boutons du site (menu, « Créer mon plan », articles…). Ils ne sont pas mesurés sur les pages de plan, de compte et de connexion."
          example="Un visiteur clique sur « Créer mon plan » puis sur « Tarifs » : 2 clics."
        />
      </section>

      <section className={styles.grid} aria-label="Activité commerciale">
        <Kpi
          icon={UserPlus}
          label="Comptes créés"
          value={biz.accounts}
          info="Le nombre de personnes qui se sont inscrites sur Fuseo (avec Google ou par e-mail). Ce chiffre vient de la base, il est exact et ne dépend pas des cookies."
          example="Sur 1 000 visiteurs, 30 créent un compte : 3 % de transformation."
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
        />
        <Kpi
          icon={Plane}
          label="Voyages enregistrés"
          value={biz.trips}
          info="Le nombre de voyages sauvegardés par les clients dans leur espace. Seul le total est affiché : le contenu des voyages est chiffré et vous ne pouvez pas le lire."
          example="Un client enregistre Paris → Tokyo et Paris → New York : 2 voyages."
        />
        <Kpi
          icon={Inbox}
          label="Demandes à traiter"
          value={biz.openMessages}
          info="Les messages reçus par le formulaire de contact qui attendent une réponse (nouveaux ou en cours)."
          example="Un client demande un rendez-vous : il reste ici tant que vous ne l'avez pas marqué « répondu »."
          chip={{ fg: '#a1281c', bg: '#fdecea' }}
        />
        <Kpi
          icon={ShieldCheck}
          label="Consentements santé"
          value={biz.healthConsents}
          info="Le nombre de clients qui ont autorisé Fuseo à enregistrer leurs données de sommeil et de voyage. Sans cet accord, rien n'est sauvegardé."
          example="Un client coche la case dans son espace : il est compté ici."
        />
      </section>

      <div className={styles.grid2}>
        <Card
          title="Fréquentation par jour"
          icon={Eye}
          hint="Passez la souris sur la courbe pour voir le détail de chaque jour."
          info="Chaque point est une journée. La courbe monte les jours où il y a plus de monde (publication d'un article, partage sur les réseaux…)."
          example="Un pic le mardi : c'est peut-être le jour où un article a été partagé."
        >
          {cur.sessions ? (
            <LineChart
              labels={daily.labels}
              series={[
                { name: 'Visiteurs', color: '#3cc0f0', values: daily.visitors },
                { name: 'Visites', color: '#0b2f55', values: daily.sessions },
                { name: 'Clics', color: '#e0a21f', values: daily.clicks },
              ]}
              caption={`Visiteurs, visites et clics par jour sur ${p.days} jours`}
            />
          ) : (
            <div className={styles.empty}>
              <b>Pas encore de visite mesurée.</b>
              <span>
                Les visites apparaissent dès que des internautes acceptent les cookies sur
                fuseo.net. Vos propres visites comptent aussi si vous acceptez.
              </span>
            </div>
          )}
        </Card>

        <Card
          title="D'où viennent les visiteurs"
          icon={Users}
          hint={
            <>
              Les canaux d&apos;arrivée, en nombre de visites.{' '}
              <Link href="/admin/statistiques">Voir le détail →</Link>
            </>
          }
          info="Le canal, c'est le chemin qui a mené la personne jusqu'au site : un moteur de recherche, un assistant comme ChatGPT, un réseau social, ou en tapant directement l'adresse."
          example="Quelqu'un demande à ChatGPT « comment éviter le jet lag ? » et clique sur le lien de Fuseo : canal « Assistants IA », source « ChatGPT »."
        >
          <BarList
            items={[...byChannel.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([c, v]) => ({ label: channelName(c), value: v, color: channelColor(c) }))}
            unit=" visites"
          />
        </Card>
      </div>
    </>
  );
}
