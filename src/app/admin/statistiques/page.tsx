import { connection } from 'next/server';
import {
  Bot,
  Globe2,
  LineChart as LineIcon,
  MousePointerClick,
  Route,
  Smartphone,
} from 'lucide-react';
import { LineChart } from '@/components/admin/Charts';
import { CHANNEL_COLOR, channelColor, channelName } from '@/components/admin/colors';
import { BarList, Card, Kpi, PageHead, Period, nf } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import {
  getBreakdown,
  getChannelsDaily,
  getEntryPages,
  getJourney,
  getKpis,
  getSources,
  getTopClicks,
  getTopPages,
  resolvePeriod,
} from '@/lib/admin/data';
import type { Channel } from '@/lib/analytics/source';

const DEVICE: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Ordinateur',
  tablet: 'Tablette',
  inconnu: 'Inconnu',
};
const LANG: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  inconnu: 'Inconnu',
};
const regions = new Intl.DisplayNames(['fr'], { type: 'region' });
const country = (c: string) => {
  try {
    return c.length === 2 ? (regions.of(c) ?? c) : c;
  } catch {
    return c;
  }
};

export default async function Statistics({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  // Données du jour : jamais prérendues.
  await connection();
  const p = resolvePeriod((await searchParams).p);
  const [
    cur,
    channels,
    sources,
    pages,
    entries,
    clicks,
    journey,
    devices,
    countries,
    langs,
    browsers,
  ] = await Promise.all([
    getKpis(p.from, p.to),
    getChannelsDaily(p),
    getSources(p),
    getTopPages(p, 12),
    getEntryPages(p, 8),
    getTopClicks(p, 15),
    getJourney(p),
    getBreakdown(p, 'device'),
    getBreakdown(p, 'country'),
    getBreakdown(p, 'locale'),
    getBreakdown(p, 'browser'),
  ]);

  const totalSessions = sources.reduce((s, x) => s + x.sessions, 0);
  const aiSources = sources.filter((s) => s.channel === 'ai');
  const aiSessions = aiSources.reduce((s, x) => s + x.sessions, 0);
  const searchSessions = sources
    .filter((s) => s.channel === 'search')
    .reduce((s, x) => s + x.sessions, 0);
  const directSessions = sources
    .filter((s) => s.channel === 'direct')
    .reduce((s, x) => s + x.sessions, 0);
  const share = (n: number) => (totalSessions ? Math.round((n / totalSessions) * 100) : 0);
  const clickRate = cur.pageViews ? Math.round((cur.clicks / cur.pageViews) * 100) : 0;

  const channelOrder = (
    ['ai', 'search', 'social', 'email', 'campaign', 'referral', 'direct'] as Channel[]
  ).filter((c) => channels.byChannel.has(c));

  return (
    <>
      <PageHead
        icon={LineIcon}
        title="Statistiques & visibilité"
        lead={`Comment les internautes trouvent Fuseo et ce qu'ils y font, sur les ${p.days} derniers jours. Survolez les courbes et cliquez sur les (i) pour comprendre chaque chiffre.`}
      >
        <Period base="/admin/statistiques" current={p.days} />
      </PageHead>

      <section className={styles.grid} aria-label="Visibilité">
        <Kpi
          icon={Bot}
          label="Venus d'une IA"
          value={aiSessions}
          suffix={totalSessions ? ` (${share(aiSessions)} %)` : ''}
          info="Les visites qui arrivent depuis un assistant d'intelligence artificielle : ChatGPT, Perplexity, Gemini, Claude, Copilot… C'est un canal nouveau et en forte croissance."
          example="Un voyageur demande à ChatGPT un plan anti-jet lag, ChatGPT cite Fuseo, la personne clique : 1 visite « IA ». Plus Fuseo est cité, plus ce chiffre monte."
          chip={{ fg: '#6a47c4', bg: '#ece6fa' }}
        />
        <Kpi
          icon={Globe2}
          label="Venus de Google & co"
          value={searchSessions}
          suffix={totalSessions ? ` (${share(searchSessions)} %)` : ''}
          info="Les visites issues d'un moteur de recherche (Google, Bing, DuckDuckGo…). C'est le fruit du référencement naturel (SEO)."
          example="Quelqu'un tape « jet lag Paris Tokyo » sur Google et clique sur Fuseo."
        />
        <Kpi
          icon={Route}
          label="Accès direct"
          value={directSessions}
          suffix={totalSessions ? ` (${share(directSessions)} %)` : ''}
          info="Les visites sans origine connue : l'adresse tapée à la main, un favori, ou un lien reçu dans une application de messagerie qui ne transmet pas l'origine."
          example="Un ami vous envoie fuseo.net par SMS : la visite est comptée en « direct »."
          chip={{ fg: '#0b2f55', bg: '#e1ecf7' }}
        />
        <Kpi
          icon={MousePointerClick}
          label="Clics par page vue"
          value={clickRate}
          suffix=" %"
          info="Le nombre de clics rapporté au nombre de pages vues. Plus il est élevé, plus les visiteurs interagissent avec le contenu au lieu de partir tout de suite."
          example="250 pages vues et 60 clics : 24 % (environ 1 clic toutes les 4 pages)."
          chip={{ fg: '#8a5a00', bg: '#fff1cf' }}
        />
      </section>

      <Card
        title="Origine des visites, jour par jour"
        icon={LineIcon}
        hint="Chaque couleur est un canal d'arrivée. La hauteur totale est le nombre de visites du jour."
        info="Ce graphique empile les canaux : en bas, ceux qui apportent le plus. Il montre si une source grandit avec le temps, par exemple l'arrivée des visiteurs venant d'assistants IA."
        example="Si la bande violette (IA) s'épaissit semaine après semaine, c'est que les assistants recommandent de plus en plus Fuseo."
      >
        {channelOrder.length ? (
          <LineChart
            stacked
            labels={channels.labels}
            series={channelOrder.map((c) => ({
              name: channelName(c),
              color: CHANNEL_COLOR[c],
              values: channels.byChannel.get(c) ?? [],
            }))}
            caption={`Visites par canal et par jour sur ${p.days} jours`}
          />
        ) : (
          <div className={styles.empty}>
            <b>Pas encore de données d&apos;origine.</b>
            <span>
              Elles s&apos;affichent dès les premières visites mesurées (visiteurs ayant accepté les
              cookies).
            </span>
          </div>
        )}
      </Card>

      <div className={styles.grid2}>
        <Card
          title="Sources détaillées"
          icon={Globe2}
          hint="Le site précis d'où viennent les visites (en nombre de visites)."
          info="Le détail de chaque canal : par exemple, dans « Assistants IA », combien viennent de ChatGPT, de Perplexity ou de Claude. Les liens étiquetés (utm_source) sont reconnus aussi."
          example="Google : 40 visites. ChatGPT : 12. Facebook : 5."
        >
          <BarList
            items={sources.slice(0, 12).map((s) => ({
              label: s.source,
              sub: channelName(s.channel),
              value: s.sessions,
              color: channelColor(s.channel),
            }))}
            unit=""
          />
        </Card>

        <Card
          title="Assistants IA"
          icon={Bot}
          hint="Quelle IA recommande Fuseo."
          info="Le détail des visites venant d'assistants IA. Astuce : pour être cité plus souvent, publiez des articles clairs, sourcés et à jour (c'est le travail du blog)."
          example="ChatGPT 8 visites, Perplexity 3 : ChatGPT est votre meilleure porte d'entrée IA."
        >
          <BarList
            items={aiSources.map((s) => ({
              label: s.source,
              value: s.sessions,
              color: CHANNEL_COLOR.ai,
            }))}
            unit=""
            empty="Aucune visite venant d'une IA pour l'instant. Cela viendra avec les citations dans les réponses des assistants."
          />
        </Card>
      </div>

      <div className={styles.grid2}>
        <Card
          title="Pages les plus vues"
          hint="Les pages que les visiteurs consultent le plus."
          info="Le classement des pages par nombre de vues. Il montre ce qui intéresse vraiment votre public."
          example="/blog/lumiere-jet-lag : 120 vues. Cet article attire : écrivez-en d'autres sur le même thème."
        >
          <BarList
            items={pages.map((r) => ({
              label: r.path,
              value: r.views,
              sub: `${nf.format(r.visitors)} visiteurs`,
            }))}
            unit=" vues"
          />
        </Card>
        <Card
          title="Pages d'entrée"
          hint="La première page vue lors d'une visite."
          info="La page sur laquelle les gens atterrissent en premier. C'est votre vitrine : elle doit donner envie de continuer."
          example="Beaucoup d'entrées par un article de blog : le blog fait office de porte d'entrée vers le planificateur."
        >
          <BarList
            items={entries.map((r) => ({ label: r.path, value: r.sessions }))}
            unit=" visites"
            color="#2f9e6e"
          />
        </Card>
      </div>

      <Card
        title="Où les visiteurs cliquent"
        icon={MousePointerClick}
        hint="Les boutons et liens les plus utilisés (pages de plan, de compte et de connexion exclues)."
        info="Chaque ligne est un bouton ou un lien du site, avec le nombre de clics et le nombre de personnes différentes qui l'ont utilisé. Cela montre ce qui attire l'œil et ce qui est ignoré."
        example="« Créer mon plan anti-jet lag » : 45 clics par 38 personnes. Si ce bouton est peu cliqué, il faut peut-être le rendre plus visible."
      >
        {clicks.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Élément cliqué</th>
                  <th>Destination</th>
                  <th>Sur la page</th>
                  <th className={styles.num}>Clics</th>
                  <th className={styles.num}>Personnes</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <b>{c.label}</b>
                    </td>
                    <td>{c.target ?? '—'}</td>
                    <td>{c.path}</td>
                    <td className={styles.num}>{nf.format(c.clicks)}</td>
                    <td className={styles.num}>{nf.format(c.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>Aucun clic enregistré sur cette période.</div>
        )}
      </Card>

      <Card
        title="Parcours des visiteurs"
        icon={Route}
        hint="Ce que font les visites une fois sur le site (en % des visites)."
        info="Un parcours simple : combien de visites vont plus loin que la première page, ouvrent le planificateur, regardent les tarifs ou la page de connexion. Les écarts montrent où l'on perd du monde."
        example="100 visites, 40 ouvrent le planificateur, 12 regardent les tarifs, 5 vont à la connexion : c'est entre le planificateur et les tarifs qu'on en perd le plus."
      >
        <BarList
          of={journey.sessions}
          items={[
            { label: 'Visites mesurées', value: journey.sessions, color: '#0b2f55' },
            { label: 'Ont vu 2 pages ou plus', value: journey.multiPage },
            { label: 'Ont ouvert le planificateur', value: journey.plan, color: '#2f9e6e' },
            { label: 'Ont consulté les tarifs', value: journey.pricing, color: '#e0a21f' },
            { label: 'Ont ouvert la connexion', value: journey.login, color: '#7b5cd6' },
            { label: 'Ont cliqué au moins une fois', value: journey.clicked, color: '#e5604d' },
          ]}
          unit=" visites"
        />
      </Card>

      <div className={styles.grid}>
        <Card
          title="Appareils"
          icon={Smartphone}
          info="Le type d'écran utilisé. Si la majorité est sur mobile, soignez surtout l'affichage mobile."
          example="70 % mobile : la plupart consultent Fuseo dans l'avion ou en voyage, sur téléphone."
        >
          <BarList
            items={devices.map((d) => ({ label: DEVICE[d.value] ?? d.value, value: d.sessions }))}
            unit=""
          />
        </Card>
        <Card
          title="Pays"
          icon={Globe2}
          info="Le pays estimé des visiteurs (d'après leur connexion, sans enregistrer l'adresse IP)."
          example="France 60 %, Suisse 15 %, Belgique 10 % : un public surtout francophone."
        >
          <BarList
            items={countries.map((d) => ({ label: country(d.value), value: d.sessions }))}
            unit=""
            empty="Le pays n'est pas encore connu."
          />
        </Card>
        <Card
          title="Langues du site"
          info="La version du site consultée (français, anglais, espagnol)."
          example="20 % de visites en anglais : un article en anglais serait utile."
        >
          <BarList
            items={langs.map((d) => ({ label: LANG[d.value] ?? d.value, value: d.sessions }))}
            unit=""
          />
        </Card>
        <Card
          title="Navigateurs"
          info="Le logiciel utilisé pour ouvrir le site (Chrome, Safari…). Utile surtout aux développeurs pour tester."
          example="Safari domine : vérifier que tout fonctionne bien sur iPhone."
        >
          <BarList items={browsers.map((d) => ({ label: d.value, value: d.sessions }))} unit="" />
        </Card>
      </div>
    </>
  );
}
