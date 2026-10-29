import { connection } from 'next/server';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, PageHead, nf } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import { getSystem } from '@/lib/admin/data';

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Paris',
      }).format(new Date(iso))
    : 'Jamais';

const LINKS = [
  {
    label: 'Google Analytics',
    href: 'https://analytics.google.com/analytics/web/#/a413973435p561403167/reports/intelligenthome',
    text: 'Audience détaillée, par Google',
  },
  {
    label: 'Google Search Console',
    href: 'https://search.google.com/search-console?resource_id=https%3A%2F%2Ffuseo.net%2F',
    text: 'Mots-clés Google et pages indexées',
  },
  {
    label: 'Microsoft Clarity',
    href: 'https://clarity.microsoft.com/projects/view/z5814q4kgc/gettingstarted',
    text: 'Enregistrements et cartes de chaleur',
  },
  {
    label: 'Supabase',
    href: 'https://supabase.com/dashboard/project/wxpeabqrpwcrkpddjcew',
    text: 'Base de données, comptes, images',
  },
  { label: 'Netlify', href: 'https://app.netlify.com/', text: 'Hébergement et déploiements' },
];

const ACTIONS: Record<string, string> = {
  'admin.unlocked': 'Ouverture de l’espace admin',
  'admin.code_failed': 'Code incorrect saisi',
  'message.status': 'Changement d’état d’une demande',
  'blog.create': 'Article créé',
  'blog.update': 'Article modifié',
  'blog.delete': 'Article supprimé',
  'blog.upload': 'Image ajoutée',
};

export default async function Settings() {
  // Données du jour : jamais prérendues.
  await connection();
  const s = await getSystem();
  const checks: Array<[string, boolean, string]> = [
    ['Google Analytics', s.flags.ga, 'Mesure d’audience Google (après consentement)'],
    ['Microsoft Clarity', s.flags.clarity, 'Enregistrements de sessions (après consentement)'],
    ['E-mails (Resend)', s.flags.resend, 'Envoi des e-mails de confirmation et de contact'],
    ['Recherche de vol', s.flags.flights, 'Saisie d’un vol par son numéro'],
    [
      'Chiffrement des données de santé',
      s.flags.encryption,
      'Les voyages sont chiffrés avant d’être stockés',
    ],
  ];
  const fresh = s.fresh;
  return (
    <>
      <PageHead
        icon={ShieldCheck}
        title="Santé & réglages"
        lead="L'état des services branchés au site, la qualité des mesures et le journal des actions faites dans cet espace."
      />
      <div className={styles.grid2}>
        <Card
          title="Services branchés"
          info="Un voyant vert signifie que le service est configuré sur le site en ligne. Un voyant orange indique qu'il manque une clé de configuration : la fonction correspondante est alors inactive."
          example="« E-mails (Resend) » orange : les e-mails de confirmation ne partiraient pas."
        >
          <ul className={styles.bars}>
            {checks.map(([name, ok, desc]) => (
              <li key={name} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className={`${styles.pill} ${ok ? styles.ok : styles.warn}`}>
                  {ok ? 'Actif' : 'À configurer'}
                </span>
                <span>
                  <b>{name}</b>
                  <br />
                  <small style={{ color: 'var(--muted)' }}>{desc}</small>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="Qualité de la mesure"
          info="Les statistiques d'audience ne comptent que les visiteurs qui acceptent les cookies. Ce bloc vérifie que les mesures arrivent bien et indique la part de visiteurs qui acceptent."
          example="Taux d'acceptation de 60 % : les chiffres représentent un peu plus de la moitié du trafic réel."
        >
          <ul className={styles.bars}>
            <li>
              <span className={`${styles.pill} ${fresh ? styles.ok : styles.warn}`}>
                {fresh ? 'Reçoit des données' : 'Aucune donnée récente'}
              </span>{' '}
              Dernier événement : <b>{when(s.lastEvent)}</b>
            </li>
            <li>
              Événements des dernières 24 h : <b>{nf.format(s.events24h)}</b>
            </li>
            <li>
              Visiteurs ayant fait un choix de cookies : <b>{nf.format(s.consent.total)}</b>
            </li>
            <li>
              Taux d&apos;acceptation de la mesure :{' '}
              <b>{s.consent.rate === null ? '—' : `${s.consent.rate} %`}</b>
            </li>
          </ul>
        </Card>
      </div>
      <Card
        title="Outils externes"
        info="Des raccourcis vers les services qui complètent cet espace. Google Analytics et Search Console donnent des détails que Fuseo ne mesure pas (mots-clés tapés sur Google, par exemple)."
        example="Pour savoir quels mots les gens tapent avant de trouver Fuseo : Google Search Console."
      >
        <div className={styles.grid}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              className={styles.card}
              href={l.href}
              target="_blank"
              rel="noopener"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <b>
                {l.label} <ExternalLink size={14} aria-hidden="true" />
              </b>
              <br />
              <small style={{ color: 'var(--muted)' }}>{l.text}</small>
            </a>
          ))}
        </div>
      </Card>
      <Card
        title="Journal des actions"
        hint="Les 15 dernières actions réalisées dans l'espace administrateur."
        info="Une trace de ce qui a été fait ici (ouvertures, modifications, suppressions). Utile pour la sécurité : un code incorrect saisi apparaît dans cette liste."
        example="« Code incorrect saisi » plusieurs fois de suite : quelqu'un essaie peut-être d'entrer."
      >
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Quand</th>
                <th>Action</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {s.audit.length ? (
                s.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{when(a.ts)}</td>
                    <td>{ACTIONS[a.action] ?? a.action}</td>
                    <td style={{ color: 'var(--muted)' }}>{a.target ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>Aucune action enregistrée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
