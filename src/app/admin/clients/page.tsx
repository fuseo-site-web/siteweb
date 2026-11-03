import { connection } from 'next/server';
import { Check, FlaskConical, Minus, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { Card, Kpi, PageHead, nf } from '@/components/admin/parts';
import { DeleteClientButton } from '@/components/admin/DeleteClientButton';
import { OfferSelect } from '@/components/admin/OfferSelect';
import { RoleSelect } from '@/components/admin/RoleSelect';
import styles from '@/components/admin/Admin.module.css';
import { getAdminSession } from '@/lib/admin/access';
import { OWNER_EMAIL } from '@/lib/access';
import { getClients } from '@/lib/admin/data';

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
  const [{ rows, total }, me] = await Promise.all([getClients(q), getAdminSession()]);
  const testers = rows.filter((r) => r.role === 'tester').length;
  const admins = rows.filter((r) => r.role === 'admin').length;
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
        <Kpi
          icon={FlaskConical}
          label="Testeurs"
          value={testers}
          chip={{ fg: '#4b2fa0', bg: '#ece6fa' }}
          info="Les pilotes : ils ont le plan complet sans payer, pour tester Fuseo en conditions réelles. Ils n'ont pas accès à l'espace admin."
          example="Vous passez Sophie en « Testeur » : elle voit tous les jours de son plan et le PDF complet."
        />
        <Kpi
          icon={ShieldCheck}
          label="Admins"
          value={admins}
          chip={{ fg: '#0f6b43', bg: '#dff5ea' }}
          info="Les comptes qui peuvent ouvrir cet espace (toujours avec le code d'ouverture). Ils ont aussi le plan complet."
          example="contact.fuseo@gmail.com est toujours admin."
        />
      </section>
      <Card
        title="Liste des clients"
        info="Chaque ligne est un compte. La corbeille supprime le compte et toutes ses données (profil, voyages, données de santé, demandes de contact) après confirmation ; les paiements sont conservés sans nom pour la comptabilité. « Offre » : l'offre que vous accordez à la main (« offert »), en plus des achats, qui s'affichent en « Payé » et ne sont jamais modifiés ici. « Rôle » : Client (accès selon son forfait, gratuit ou payant), Testeur (pilote : plan complet sans payer, pas d'admin) ou Admin (plan complet + cet espace, avec le code d'ouverture). Le changement est enregistré immédiatement. « Voyages » est le nombre de voyages enregistrés. « Santé » indique si le client a autorisé l'enregistrement de ses données de sommeil. La date de naissance n'est volontairement pas affichée."
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
                  <th>Rôle</th>
                  <th>Offre</th>
                  <th className={styles.num}>Voyages</th>
                  <th>Profil</th>
                  <th>Santé</th>
                  <th>
                    <span className={styles.srOnly}>Supprimer</span>
                  </th>
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
                      <RoleSelect
                        id={r.id}
                        email={r.email}
                        role={r.role}
                        locked={
                          r.email.toLowerCase() === OWNER_EMAIL
                            ? 'Compte propriétaire : toujours administrateur.'
                            : r.id === me?.id
                              ? 'Votre propre compte : rôle non modifiable ici.'
                              : undefined
                        }
                      />
                    </td>
                    <td>
                      <OfferSelect
                        id={r.id}
                        email={r.email}
                        offer={r.manualOffer ?? 'free'}
                        paid={r.paidOffer}
                      />
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
                    <td>
                      <DeleteClientButton
                        id={r.id}
                        email={r.email}
                        locked={
                          r.email.toLowerCase() === OWNER_EMAIL
                            ? 'Compte propriétaire : il ne peut pas être supprimé.'
                            : r.id === me?.id
                              ? 'Votre propre compte.'
                              : undefined
                        }
                      />
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
