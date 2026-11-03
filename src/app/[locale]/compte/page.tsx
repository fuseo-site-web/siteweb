import { ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { connection } from 'next/server';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { DeleteAccount, HealthConsent, SignOutButton } from '@/components/account/AccountClient';
import styles from '@/components/account/Account.module.css';
import dash from '@/components/account/Dashboard.module.css';
import { BillingActions } from '@/components/account/BillingActions';
import { PasswordAccess } from '@/components/account/PasswordAccess';
import { ProfileForm } from '@/components/account/ProfileForm';
import { ViewAsSelect } from '@/components/account/ViewAsSelect';
import { Tabs } from '@/components/account/Tabs';
import { Welcome } from '@/components/account/Welcome';
import { Ticket } from '@/components/account/Ticket';
import { PageHero } from '@/components/content/PageHero';
import { Link, redirect } from '@/i18n/navigation';
import { canOpenAdmin } from '@/lib/admin/access';
import { getRole, getViewOffer, OFFERS } from '@/lib/access';
import { BILLING_OFFERS } from '@/lib/billing/offers';
import { billingEnabled } from '@/lib/billing/stripe';
import { getCurrentUser } from '@/lib/auth';
import { decryptJson } from '@/lib/crypto/health';
import type { PlanInput } from '@/lib/plan-schema';
import { isProfileComplete, safeNext } from '@/lib/onboarding';
import { COUNTRY_CODES } from '@/lib/profile-schema';
import { pageMetadata } from '@/lib/seo';
import { buildTicket, splitTickets, type TicketView } from '@/lib/trip-view';

type Props = PageProps<'/[locale]/compte'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return pageMetadata({
    locale,
    pathname: '/compte',
    title: t('title'),
    description: t('lead'),
    noindex: true,
  });
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className={styles.wrap} aria-busy="true" />}>
      <Dashboard
        locale={locale}
        next={searchParams.then((q) => (typeof q.next === 'string' ? q.next : null))}
      />
    </Suspense>
  );
}

async function Dashboard({ locale, next }: { locale: string; next: Promise<string | null> }) {
  // L'heure courante (statut à venir / passé) est propre à chaque requête.
  await connection();
  const { supabase, user } = await getCurrentUser();
  if (!user) return redirect({ href: '/connexion', locale: locale as 'fr' | 'en' | 'es' });

  const role = await getRole(user);
  const viewAs = await getViewOffer(role);
  const t = await getTranslations({ locale, namespace: 'account' });
  const format = await getFormatter({ locale });
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long' });

  const [entitlements, trips, consent, sleep, profile, payments, customer] = await Promise.all([
    supabase
      .from('entitlements')
      .select('id, offer, status, expires_at, trip_credits')
      .order('created_at', { ascending: false }),
    supabase.from('trips').select('id, inputs_enc'),
    supabase.from('health_consents').select('granted_at').is('withdrawn_at', null).maybeSingle(),
    supabase.from('sleep_profiles').select('updated_at').maybeSingle(),
    supabase
      .from('user_profiles')
      .select('first_name, last_name, birth_date, country, home_airport, preferred_locale')
      .maybeSingle(),
    supabase
      .from('payments')
      .select('id, offer, amount_cents, currency, status, created_at, receipt_url, invoice_url')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('billing_customers').select('user_id').maybeSingle(),
  ]);

  // Les voyages sont chiffrés : déchiffrés ici, côté serveur, pour leur seul propriétaire.
  const tickets: TicketView[] = [];
  for (const row of trips.data ?? []) {
    try {
      tickets.push(buildTicket(row.id, decryptJson<PlanInput>(row.inputs_enc), locale));
    } catch {
      /* clé indisponible ou donnée illisible : le voyage n'est pas affiché */
    }
  }
  const { upcoming, past } = splitTickets(tickets);

  const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRY_CODES.map((code) => ({
    code,
    label: regionNames.of(code) ?? code,
  })).sort((a, b) => a.label.localeCompare(b.label, locale));

  const p = profile.data;

  // Première connexion : message de bienvenue, puis informations du compte avant l'accès à l'espace.
  if (!isProfileComplete(p)) {
    const meta = user.user_metadata as Record<string, unknown>;
    const fromGoogle = (k: string) =>
      typeof meta[k] === 'string' ? (meta[k] as string).trim().slice(0, 80) : '';
    const target = safeNext(await next, '');
    return (
      <Welcome
        locale={locale}
        email={user.email ?? ''}
        countries={countries}
        next={target || null}
        initial={{
          firstName: p?.first_name || fromGoogle('given_name'),
          lastName: p?.last_name || fromGoogle('family_name'),
          birthDate: p?.birth_date ?? '',
          country: p?.country ?? '',
          homeAirport: p?.home_airport ?? '',
          preferredLocale: p?.preferred_locale ?? locale,
        }}
      />
    );
  }

  const filled = [p?.first_name, p?.last_name, p?.birth_date, p?.country, p?.home_airport].filter(
    Boolean,
  ).length;
  const completion = Math.round((filled / 5) * 100);
  const displayName = p?.first_name || (user.email ?? '').split('@')[0] || '';
  const initials = (p?.first_name || p?.last_name || user.email || '?').slice(0, 1).toUpperCase();
  const active = entitlements.data?.filter((e) => e.status === 'active') ?? [];
  const offerName: Record<string, string> = {
    voyage: 'Un voyage',
    annuel: 'Grand voyageur',
    ami: 'Accès invité',
    pro: 'Fuseo Pro',
  };
  const viewLabel = (v: string) => (v === 'free' ? t('viewAsFree') : (offerName[v] ?? v));
  const zones = tickets.reduce((n, x) => n + x.zonesCrossed, 0);

  const renderTickets = (list: TicketView[], empty: string, withCta: boolean) =>
    list.length ? (
      <div className={dash.list}>
        {list.map((x) => (
          <Ticket key={x.id} ticket={x} locale={locale} />
        ))}
      </div>
    ) : (
      <div className={dash.empty}>
        <p>{empty}</p>
        {withCta ? (
          <Link href="/plan" className={dash.cta}>
            {t('create')}
          </Link>
        ) : null}
      </div>
    );

  const tripsPanel = (
    <>
      <div className={dash.listHead}>
        <span />
        <Link href="/plan" className={dash.cta}>
          {t('create')}
        </Link>
      </div>
      <Tabs
        label={t('tabTrips')}
        variant="segmented"
        initial={upcoming.length || !past.length ? 'upcoming' : 'past'}
        tabs={[
          {
            id: 'upcoming',
            label: t('upcoming'),
            count: upcoming.length,
            content: renderTickets(upcoming, t('emptyUpcoming'), true),
          },
          {
            id: 'past',
            label: t('past'),
            count: past.length,
            content: renderTickets(past, t('emptyPast'), false),
          },
        ]}
      />
    </>
  );

  const money = (cents: number, currency = 'eur') =>
    format.number(cents / 100, { style: 'currency', currency: currency.toUpperCase() });
  const paymentPanel = (
    <div className={styles.payGrid}>
      <section className={styles.card}>
        <h2>{t('payTitle')}</h2>
        {active.length ? (
          active.map((e) => (
            <p key={e.id}>
              <span className={styles.badge}>{offerName[e.offer] ?? e.offer}</span>
              <br />
              {e.expires_at ? t('accessUntil', { date: date(e.expires_at) }) : null}
              {e.trip_credits > 0 ? ` · ${t('credits', { n: e.trip_credits })}` : null}
            </p>
          ))
        ) : (
          <p>{t('free')}</p>
        )}
        <BillingActions
          mode="buy"
          enabled={billingEnabled()}
          hasCustomer={!!customer.data}
          prices={{
            voyage: money(BILLING_OFFERS.voyage.amountCents),
            annuel: money(BILLING_OFFERS.annuel.amountCents),
          }}
        />
        {billingEnabled() ? null : <p className={styles.hint}>{t('paySoon')}</p>}
        <Link href="/tarifs" className={styles.linkAccent}>
          {t('paySeeOffers')}
        </Link>
      </section>
      <section className={styles.card}>
        <h2>{t('payMethods')}</h2>
        <p>{t('payMethodsText')}</p>
        <BillingActions
          mode="portal"
          enabled={billingEnabled()}
          hasCustomer={!!customer.data}
          prices={{ voyage: '', annuel: '' }}
        />
        {customer.data ? null : <p className={styles.hint}>{t('payManageNone')}</p>}
      </section>
      <section className={`${styles.card} ${styles.wide}`}>
        <h2>{t('payHistory')}</h2>
        {payments.data?.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('payDate')}</th>
                  <th>{t('payOffer')}</th>
                  <th>{t('payAmount')}</th>
                  <th>{t('payStatus')}</th>
                  <th>{t('payReceipt')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.map((pay) => (
                  <tr key={pay.id}>
                    <td>{date(pay.created_at)}</td>
                    <td>{offerName[pay.offer] ?? pay.offer}</td>
                    <td>{money(pay.amount_cents, pay.currency)}</td>
                    <td>
                      <span className={styles.badge} data-status={pay.status}>
                        {t(`payState.${pay.status}`)}
                      </span>
                    </td>
                    <td>
                      {pay.receipt_url || pay.invoice_url ? (
                        <a
                          href={(pay.invoice_url || pay.receipt_url)!}
                          target="_blank"
                          rel="noopener"
                          className={styles.linkAccent}
                        >
                          {t('payReceiptLink')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('payEmpty')}</p>
        )}
      </section>
    </div>
  );

  const dataPanel = (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h2>{t('access')}</h2>
        {role === 'admin' ? (
          <ViewAsSelect
            value={viewAs ?? 'full'}
            options={[
              { value: 'full', label: t('viewAsFull') },
              ...(['free', ...OFFERS] as const).map((v) => ({ value: v, label: viewLabel(v) })),
            ]}
          />
        ) : null}
        {viewAs ? (
          viewAs === 'free' ? (
            <p>{t('free')}</p>
          ) : (
            <p>
              <span className={styles.badge}>{viewLabel(viewAs)}</span>
            </p>
          )
        ) : active.length ? (
          active.map((e) => (
            <p key={e.id}>
              <span className={styles.badge}>{offerName[e.offer] ?? e.offer}</span>
              <br />
              {e.expires_at ? t('accessUntil', { date: date(e.expires_at) }) : null}
              {e.trip_credits > 0 ? ` · ${t('credits', { n: e.trip_credits })}` : null}
            </p>
          ))
        ) : (
          <p>{t('free')}</p>
        )}
        {/* Seuls les administrateurs modifient leur accès ici (simulation d'offre) ; les clients passent par Paiement. */}
        {role !== 'admin' ? <p className={styles.hint}>{t('accessReadonly')}</p> : null}
      </section>
      <section className={styles.card}>
        <h2>{t('passwordTitle')}</h2>
        {/* Compte Google sans mot de passe : `email` absent des fournisseurs tant qu'aucun mot de passe n'est ajouté. */}
        <PasswordAccess
          email={user.email ?? ''}
          hasPassword={
            ((user.app_metadata?.providers as string[] | undefined)?.includes('email') ?? false) ||
            user.user_metadata?.has_password === true
          }
        />
      </section>
      <section className={styles.card}>
        <h2>{t('health')}</h2>
        <p>
          {consent.data ? t('healthOn', { date: date(consent.data.granted_at) }) : t('healthOff')}
        </p>
        {sleep.data ? <p>{t('profileSaved', { date: date(sleep.data.updated_at) })}</p> : null}
        <HealthConsent granted={!!consent.data} />
      </section>
      <section className={styles.card}>
        <h2>{t('danger')}</h2>
        <p>{t('dangerText')}</p>
        <DeleteAccount />
      </section>
    </div>
  );

  const profilePanel = (
    <section className={styles.card}>
      <h2>{t('profileTitle')}</h2>
      <p>{t('profileLead')}</p>
      <ProfileForm
        email={user.email ?? ''}
        countries={countries}
        initial={{
          firstName: p?.first_name ?? '',
          lastName: p?.last_name ?? '',
          birthDate: p?.birth_date ?? '',
          country: p?.country ?? '',
          homeAirport: p?.home_airport ?? '',
          preferredLocale: p?.preferred_locale ?? locale,
        }}
      />
    </section>
  );

  return (
    <>
      <PageHero title={t('title')} lead={t('lead')} icon="user" />
      <div className={styles.wrap}>
        <section className={dash.top} aria-label={t('greeting', { name: displayName })}>
          <span className={dash.avatar} aria-hidden="true">
            {initials}
          </span>
          <div className={dash.who}>
            <h2>{t('greeting', { name: displayName })}</h2>
            <p>
              {user.email} · {t('memberSince', { date: date(user.created_at) })}
            </p>
            {completion < 100 ? (
              <div className={dash.progress}>
                <small id="profile-progress">{t('profileProgress', { n: completion })}</small>
                <progress max={100} value={completion} aria-labelledby="profile-progress" />
              </div>
            ) : null}
          </div>
          <div className={dash.topSide}>
            {viewAs ? (
              <span className={dash.badge}>{t('viewAsBadge', { offer: viewLabel(viewAs) })}</span>
            ) : role !== 'client' ? (
              <span className={dash.badge}>
                {role === 'admin' ? t('roleAdmin') : t('roleTester')}
              </span>
            ) : active[0] ? (
              <span className={dash.badge}>{offerName[active[0].offer] ?? active[0].offer}</span>
            ) : null}
            {(await canOpenAdmin(user)) ? (
              // Réservé au compte administrateur : l'espace /admin demande ensuite son code d'ouverture.
              <NextLink href="/admin" className={dash.adminBtn}>
                <ShieldCheck size={16} aria-hidden="true" /> Espace administrateur
              </NextLink>
            ) : null}
            <SignOutButton className={dash.signout} />
          </div>
        </section>

        <div className={dash.stats}>
          <div className={dash.stat}>
            <b>{tickets.length}</b>
            <span>{t('statTrips')}</span>
          </div>
          <div className={dash.stat}>
            <b>{upcoming.length}</b>
            <span>{t('statUpcoming')}</span>
          </div>
          <div className={dash.stat}>
            <b>{zones}</b>
            <span>{t('statZones')}</span>
          </div>
          <div className={dash.stat}>
            <b className={dash.small}>
              {upcoming[0] ? t('countdown', { n: Math.max(upcoming[0].daysUntil, 0) }) : '—'}
            </b>
            <span>{t('statNext')}</span>
          </div>
        </div>

        <Tabs
          label={t('title')}
          tabs={[
            { id: 'trips', label: t('tabTrips'), count: tickets.length, content: tripsPanel },
            { id: 'profile', label: t('tabProfile'), content: profilePanel },
            { id: 'data', label: t('tabData'), content: dataPanel },
            { id: 'payment', label: t('tabPayment'), content: paymentPanel },
          ]}
        />
      </div>
    </>
  );
}
