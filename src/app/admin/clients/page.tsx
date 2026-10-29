import { connection } from 'next/server';
import { Check, Minus, Users } from 'lucide-react';
import Link from 'next/link';
import { Card, Kpi, PageHead, nf } from '@/components/admin/parts';
import styles from '@/components/admin/Admin.module.css';
import { getClients } from '@/lib/admin/data';

const OFFER: Record<string, string> = {
  voyage: 'Un voyage',
  annuel: 'Grand voyageur',
  ami: 'Accès invité',
  pro: 'Fuseo Pro',
};
const regions = new Intl.DisplayNames(['fr'], { type: 'region' });
const day = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' }).format(
        new Date(iso),
      )
    : '—';

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Données du jour : jamais prérendues.
  await connection();
  const { q } = await searchParams;
  const { rows, total } = await getClients(q);
  const complete = rows.filter((r) => r.profileComplete).length;
  const withTrip = rows.filter((r) => r.trips > 0).length;
  return (
    <>
      <PageHead
        icon={Users}
        title="Clients"
        lead="Les personnes qui ont créé un compte. Vous voyez leur identité et leur activité, jamais le contenu de leurs voyages ni leurs données de santé (chiffrées)."
      />
      <section className={styles.grid}>
        <Kpi
          icon={Users}
          label="Comptes"
          value={total}
          info="Le nombre total de comptes créés sur Fuseo."
          example="Léa s'inscrit avec Google : un compte de plus."
        />
        <Kpi
          icon={Check}
          label="Profils complets"
          value={complete}
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
          info="Les clients qui ont rempli prénom, nom, date de naissance, pays et aéroport habituel (écran de bienvenue)."
          example="Sur 20 comptes, 17 profils complets : 85 %."
        />
        <Kpi
          icon={Users}
          label="Avec au moins un voyage"
          value={withTrip}
          chip={{ fg: '#6a47c4', bg: '#ece6fa' }}
          info="Les clients qui ont enregistré un voyage : ce sont les plus engagés."
          example="Un compte sans voyage est à relancer (voir l'onglet Nurturing)."
        />
      </section>
      <Card
        title="Liste des clients"
        info="Chaque ligne est un compte. « Voyages » est le nombre de voyages enregistrés. « Santé » indique si le client a autorisé l'enregistrement de ses données de sommeil. La date de naissance n'est volontairement pas affichée."
        example="Marc · France · 2 voyages · Santé ✓ : un client actif qui a donné son accord."
      >
        <form className={styles.search} role="search">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Rechercher un nom ou une adresse e-mail"
            aria-label="Rechercher un client"
          />
          <button className={styles.btn} type="submit">
            Rechercher
          </button>
          {q ? (
            <Link className={styles.btnGhost} href="/admin/clients">
              Effacer
            </Link>
          ) : null}
        </form>
        {rows.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Pays</th>
                  <th>Inscrit le</th>
                  <th>Dernière connexion</th>
                  <th>Offre</th>
                  <th className={styles.num}>Voyages</th>
                  <th>Profil</th>
                  <th>Santé</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name || '—'}</b>
                      <br />
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                        {r.email} · {r.provider === 'google' ? 'Google' : 'E-mail'}
                      </span>
                    </td>
                    <td>{r.country ? (regions.of(r.country) ?? r.country) : '—'}</td>
                    <td>{day(r.createdAt)}</td>
                    <td>{day(r.lastSignIn)}</td>
                    <td>
                      {r.offer ? (
                        <span className={`${styles.pill} ${styles.ok}`}>
                          {OFFER[r.offer] ?? r.offer}
                        </span>
                      ) : (
                        <span className={styles.pill}>Gratuit</span>
                      )}
                    </td>
                    <td className={styles.num}>{nf.format(r.trips)}</td>
                    <td>
                      {r.profileComplete ? (
                        <Check size={18} color="#0f6b43" aria-label="Complet" />
                      ) : (
                        <Minus size={18} color="#8594ab" aria-label="Incomplet" />
                      )}
                    </td>
                    <td>
                      {r.healthConsent ? (
                        <Check size={18} color="#0f6b43" aria-label="Accord donné" />
                      ) : (
                        <Minus size={18} color="#8594ab" aria-label="Pas d'accord" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>Aucun client ne correspond.</div>
        )}
      </Card>
    </>
  );
}
