import { DELETION_REASON_FR, type DeletionReason } from '@/lib/account/deletion';
import { esc, renderEmail, SITE, type EmailContent, type Lang } from './layout';

/** E-mails liés à la suppression de compte : accusé de réception, notification à l'équipe, confirmation. */

const ACCOUNT: Record<Lang, string> = { fr: '/mon-compte', en: '/en/account', es: '/es/mi-cuenta' };
const HOME: Record<Lang, string> = { fr: '/', en: '/en', es: '/es' };

const T: Record<
  Lang,
  {
    ackSubject: string;
    ackTitle: string;
    ackBody: string;
    ackDelay: string;
    ackCancel: string;
    ackCta: string;
    doneSubject: string;
    doneTitle: string;
    doneBody: string;
    doneKept: string;
    doneCta: string;
    hello: string;
    sign: string;
    why: string;
  }
> = {
  fr: {
    ackSubject: 'Votre demande de suppression de compte',
    ackTitle: 'Nous avons bien reçu votre demande',
    ackBody:
      'Vous avez demandé la suppression de votre compte Fuseo. Notre équipe la traite dans les meilleurs délais, et au plus tard sous un mois, comme le prévoit le RGPD.',
    ackDelay: 'Vous recevrez un e-mail de confirmation dès que la suppression sera effectuée.',
    ackCancel:
      'Vous avez changé d’avis ? Vous pouvez annuler votre demande depuis votre espace, tant qu’elle n’a pas été traitée.',
    ackCta: 'Ouvrir mon espace',
    doneSubject: 'Votre compte Fuseo a été supprimé',
    doneTitle: 'Votre compte a été supprimé',
    doneBody:
      'Comme vous l’avez demandé, votre compte Fuseo et vos données (profil, voyages, données de sommeil et de santé) ont été supprimés.',
    doneKept:
      'Seules les factures éventuelles sont conservées, sans données de santé, comme l’exige la loi.',
    doneCta: 'Revenir sur Fuseo',
    hello: 'Bonjour,',
    sign: 'Bien à vous,\nL’équipe Fuseo',
    why: 'Vous recevez cet e-mail suite à votre demande de suppression de compte sur fuseo.net.',
  },
  en: {
    ackSubject: 'Your account deletion request',
    ackTitle: 'We have received your request',
    ackBody:
      'You asked for your Fuseo account to be deleted. Our team handles it as quickly as possible, and within one month at the latest, as required by the GDPR.',
    ackDelay: 'You will receive a confirmation email as soon as the deletion is done.',
    ackCancel:
      'Changed your mind? You can cancel your request from your account until it has been processed.',
    ackCta: 'Open my account',
    doneSubject: 'Your Fuseo account has been deleted',
    doneTitle: 'Your account has been deleted',
    doneBody:
      'As you requested, your Fuseo account and your data (profile, trips, sleep and health data) have been deleted.',
    doneKept: 'Only any invoices are kept, without health data, as required by law.',
    doneCta: 'Back to Fuseo',
    hello: 'Hello,',
    sign: 'Kind regards,\nThe Fuseo team',
    why: 'You are receiving this email following your account deletion request on fuseo.net.',
  },
  es: {
    ackSubject: 'Su solicitud de eliminación de cuenta',
    ackTitle: 'Hemos recibido su solicitud',
    ackBody:
      'Ha solicitado la eliminación de su cuenta de Fuseo. Nuestro equipo la tramita lo antes posible y, como máximo, en un mes, como establece el RGPD.',
    ackDelay: 'Recibirá un correo de confirmación en cuanto se haya realizado la eliminación.',
    ackCancel:
      '¿Ha cambiado de opinión? Puede cancelar su solicitud desde su espacio mientras no se haya tramitado.',
    ackCta: 'Abrir mi espacio',
    doneSubject: 'Su cuenta de Fuseo ha sido eliminada',
    doneTitle: 'Su cuenta ha sido eliminada',
    doneBody:
      'Tal como lo solicitó, su cuenta de Fuseo y sus datos (perfil, viajes, datos de sueño y salud) han sido eliminados.',
    doneKept: 'Solo se conservan las posibles facturas, sin datos de salud, como exige la ley.',
    doneCta: 'Volver a Fuseo',
    hello: 'Hola,',
    sign: 'Atentamente,\nEl equipo de Fuseo',
    why: 'Recibe este correo tras su solicitud de eliminación de cuenta en fuseo.net.',
  },
};

/** Accusé de réception de la demande, au client. */
export function buildDeletionAck(lang: Lang, email: string) {
  const l = T[lang];
  const content: EmailContent = {
    subject: l.ackSubject,
    preheader: l.ackBody,
    title: l.ackTitle,
    intro: [esc(l.hello), esc(l.ackBody), esc(l.ackDelay)],
    note: l.ackCancel,
    cta: { label: l.ackCta, url: `${SITE}${ACCOUNT[lang]}` },
    signature: l.sign,
  };
  return renderEmail(content, { lang, email, why: l.why });
}

/** Confirmation, après la suppression effectuée par l'équipe. */
export function buildDeletionDone(lang: Lang, email: string) {
  const l = T[lang];
  const content: EmailContent = {
    subject: l.doneSubject,
    preheader: l.doneBody,
    title: l.doneTitle,
    intro: [esc(l.hello), esc(l.doneBody), esc(l.doneKept)],
    cta: { label: l.doneCta, url: `${SITE}${HOME[lang]}` },
    signature: l.sign,
  };
  return renderEmail(content, { lang, email, why: l.why });
}

/** Notification à l'équipe : qui, pourquoi, et où traiter la demande. */
export function buildDeletionAdmin(input: {
  email: string;
  name?: string | null;
  reason: DeletionReason;
  comment?: string | null;
}) {
  const who = input.name?.trim() || input.email;
  const content: EmailContent = {
    subject: `[Fuseo] Demande de suppression de compte · ${who}`,
    preheader: `${who} : ${DELETION_REASON_FR[input.reason]}`,
    title: 'Nouvelle demande de suppression de compte',
    intro: [
      esc(
        `${who} demande la suppression de son compte. À traiter sous un mois au plus tard (RGPD).`,
      ),
    ],
    facts: [
      { label: 'Client', value: who },
      { label: 'E-mail', value: input.email, href: `mailto:${input.email}` },
      { label: 'Motif', value: DELETION_REASON_FR[input.reason] },
    ],
    ...(input.comment ? { quote: { label: 'Commentaire', text: input.comment } } : {}),
    cta: { label: 'Traiter dans l’espace admin', url: `${SITE}/admin/clients` },
    signature: 'Notification automatique de fuseo.net.',
  };
  return renderEmail(content, {
    lang: 'fr',
    why: 'Notification automatique de fuseo.net, envoyée à l’adresse administrateur.',
  });
}
