import { connection } from 'next/server';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import styles from '@/components/admin/Admin.module.css';
import { Card, PageHead } from '@/components/admin/parts';
import { SupportComposer, SupportStatus } from '@/components/admin/SupportComposer';
import { getSupportThread, getSupportTickets } from '@/lib/admin/data';
import { REASON_FR, type SupportReason } from '@/lib/support/reasons';

const STATUS: Record<string, string> = { open: 'À traiter', answered: 'Répondu', closed: 'Clos' };
const LANG: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español' };
const when = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));

export default async function Support({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  // Données en temps réel : jamais prérendues.
  await connection();
  const { t } = await searchParams;
  const tickets = await getSupportTickets();
  const current = tickets.find((x) => x.id === t) ?? tickets[0] ?? null;
  const thread = current ? await getSupportThread(current.id) : [];
  const todo = tickets.filter((x) => x.status === 'open').length;

  return (
    <>
      <PageHead
        icon={LifeBuoy}
        title="Support"
        lead={`Les demandes envoyées par les clients connectés (bouton « ? »). ${todo} à traiter sur ${tickets.length}.`}
      />
      <Card
        title="Conversations"
        info="Chaque demande a un numéro de dossier (SUP-…), communiqué au client par e-mail. Vous répondez ici comme dans une messagerie : la réponse part par e-mail aux couleurs de Fuseo et s'affiche dans l'espace du client. Utilisez « Aperçu » pour voir l'e-mail avant l'envoi."
        example="SUP-7KQ4ZD · Paiement : vous répondez, le client reçoit l'e-mail et peut vous répondre depuis son espace."
      >
        {tickets.length ? (
          <div className={styles.supportLayout}>
            <ul className={styles.ticketList}>
              {tickets.map((x) => (
                <li key={x.id}>
                  <Link
                    href={`/admin/support?t=${x.id}`}
                    className={styles.ticketItem}
                    aria-current={x.id === current?.id ? 'true' : undefined}
                  >
                    <span className={styles.ticketTop}>
                      <b>{x.name || x.email}</b>
                      {x.unreadAdmin ? (
                        <i className={styles.unreadDot} aria-label="Non lu" />
                      ) : null}
                    </span>
                    <span className={styles.ticketMeta}>
                      {x.ref} · {REASON_FR[x.reason as SupportReason] ?? x.reason}
                    </span>
                    <span className={styles.ticketPreview}>{x.preview}</span>
                    <span className={styles.ticketMeta}>
                      <span
                        className={`${styles.pill} ${x.status === 'open' ? styles.warn : x.status === 'answered' ? styles.ok : ''}`}
                      >
                        {STATUS[x.status] ?? x.status}
                      </span>{' '}
                      {when(x.lastMessageAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {current ? (
              <section className={styles.thread} aria-label={`Dossier ${current.ref}`}>
                <header className={styles.threadHead}>
                  <div>
                    <b>{current.name || current.email}</b>
                    <span className={styles.ticketMeta}>
                      {current.ref} · {REASON_FR[current.reason as SupportReason] ?? current.reason}{' '}
                      · <a href={`mailto:${current.email}`}>{current.email}</a> ·{' '}
                      {LANG[current.locale] ?? current.locale}
                    </span>
                  </div>
                  <SupportStatus
                    id={current.id}
                    status={current.status}
                    unread={current.unreadAdmin}
                  />
                </header>
                <ol className={styles.bubbles}>
                  {thread.map((m) => (
                    <li key={m.id} data-author={m.author}>
                      <p>{m.body}</p>
                      <small>
                        {m.author === 'admin' ? 'Équipe Fuseo' : current.name || 'Client'} ·{' '}
                        {when(m.created_at)}
                      </small>
                    </li>
                  ))}
                </ol>
                <SupportComposer id={current.id} />
              </section>
            ) : null}
          </div>
        ) : (
          <div className={styles.empty}>
            Aucune demande pour l&apos;instant. Elles apparaîtront ici dès qu&apos;un client
            connecté utilisera le bouton « ? ».
          </div>
        )}
      </Card>
    </>
  );
}
