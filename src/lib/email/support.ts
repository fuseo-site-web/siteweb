import { REASON_FR, type SupportReason } from '@/lib/support/reasons';
import { esc, renderEmail, SITE, type EmailContent, type Lang } from './layout';

/** E-mails du support : accusé de réception (avec numéro de dossier), notification à l'équipe, réponse de l'équipe. */

const ACCOUNT: Record<Lang, string> = { fr: '/mon-compte', en: '/en/account', es: '/es/mi-cuenta' };
const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] ?? '';

const REASON: Record<Lang, Record<SupportReason, string>> = {
  fr: REASON_FR,
  en: {
    plan: 'Question about my plan',
    account: 'My account or signing in',
    payment: 'Payment or plan',
    technical: 'Technical problem',
    health: 'Question about sleep or health',
    other: 'Other request',
  },
  es: {
    plan: 'Pregunta sobre mi plan',
    account: 'Mi cuenta o el inicio de sesión',
    payment: 'Pago u oferta',
    technical: 'Problema técnico',
    health: 'Pregunta sobre el sueño o la salud',
    other: 'Otra solicitud',
  },
};

const T: Record<
  Lang,
  {
    ackSubject: (ref: string) => string;
    ackTitle: string;
    hello: (n: string) => string;
    ackBody: (ref: string) => string;
    ackDelay: string;
    yourMessage: string;
    ref: string;
    reason: string;
    replySubject: (ref: string) => string;
    replyTitle: string;
    replyIntro: (ref: string) => string;
    answer: string;
    followUp: string;
    cta: string;
    sign: string;
    why: string;
  }
> = {
  fr: {
    ackSubject: (r) => `Votre demande au support Fuseo · dossier ${r}`,
    ackTitle: 'Votre demande est bien enregistrée',
    hello: (n) => (n ? `Bonjour ${n},` : 'Bonjour,'),
    ackBody: (r) =>
      `Merci pour votre message. Votre numéro de dossier est ${r} : gardez-le, il permet de retrouver votre demande.`,
    ackDelay:
      'Notre équipe vous répond en général sous 24 à 48 heures ouvrées, par e-mail et dans votre espace.',
    yourMessage: 'Votre message',
    ref: 'Numéro de dossier',
    reason: 'Motif',
    replySubject: (r) => `Réponse du support Fuseo · dossier ${r}`,
    replyTitle: 'Le support Fuseo vous a répondu',
    replyIntro: (r) => `Voici la réponse de notre équipe à votre demande (dossier ${r}).`,
    answer: 'Notre réponse',
    followUp:
      'Pour poursuivre l’échange, répondez depuis votre espace Fuseo (bouton « ? » en bas de l’écran).',
    cta: 'Ouvrir mon espace',
    sign: 'Bien à vous,\nL’équipe support Fuseo',
    why: 'Vous recevez cet e-mail car vous avez contacté le support depuis votre compte fuseo.net.',
  },
  en: {
    ackSubject: (r) => `Your request to Fuseo support · case ${r}`,
    ackTitle: 'Your request has been received',
    hello: (n) => (n ? `Hello ${n},` : 'Hello,'),
    ackBody: (r) =>
      `Thank you for your message. Your case number is ${r}: keep it, it lets us find your request.`,
    ackDelay:
      'Our team usually replies within 24 to 48 working hours, by email and in your account.',
    yourMessage: 'Your message',
    ref: 'Case number',
    reason: 'Reason',
    replySubject: (r) => `Reply from Fuseo support · case ${r}`,
    replyTitle: 'Fuseo support has replied',
    replyIntro: (r) => `Here is our team's reply to your request (case ${r}).`,
    answer: 'Our reply',
    followUp:
      'To continue the conversation, reply from your Fuseo account (the “?” button at the bottom of the screen).',
    cta: 'Open my account',
    sign: 'Kind regards,\nThe Fuseo support team',
    why: 'You are receiving this email because you contacted support from your fuseo.net account.',
  },
  es: {
    ackSubject: (r) => `Su solicitud al soporte de Fuseo · expediente ${r}`,
    ackTitle: 'Su solicitud ha sido registrada',
    hello: (n) => (n ? `Hola ${n},` : 'Hola,'),
    ackBody: (r) =>
      `Gracias por su mensaje. Su número de expediente es ${r}: consérvelo, permite encontrar su solicitud.`,
    ackDelay:
      'Nuestro equipo suele responder en 24 a 48 horas laborables, por correo y en su espacio.',
    yourMessage: 'Su mensaje',
    ref: 'Número de expediente',
    reason: 'Motivo',
    replySubject: (r) => `Respuesta del soporte de Fuseo · expediente ${r}`,
    replyTitle: 'El soporte de Fuseo le ha respondido',
    replyIntro: (r) => `Esta es la respuesta de nuestro equipo a su solicitud (expediente ${r}).`,
    answer: 'Nuestra respuesta',
    followUp:
      'Para continuar la conversación, responda desde su espacio Fuseo (botón «?» en la parte inferior de la pantalla).',
    cta: 'Abrir mi espacio',
    sign: 'Atentamente,\nEl equipo de soporte de Fuseo',
    why: 'Recibe este correo porque contactó con el soporte desde su cuenta de fuseo.net.',
  },
};

export interface SupportTicketInfo {
  ref: string;
  reason: SupportReason;
  email: string;
  name?: string | null;
  locale: Lang;
}

/** Accusé de réception au client, avec son numéro de dossier. */
export function buildSupportAck(t: SupportTicketInfo, message: string) {
  const l = T[t.locale];
  const content: EmailContent = {
    subject: l.ackSubject(t.ref),
    preheader: l.ackBody(t.ref),
    title: l.ackTitle,
    intro: [esc(l.hello(firstName(t.name))), esc(l.ackBody(t.ref)), esc(l.ackDelay)],
    facts: [
      { label: l.ref, value: t.ref },
      { label: l.reason, value: REASON[t.locale][t.reason] },
    ],
    quote: { label: l.yourMessage, text: message },
    cta: { label: l.cta, url: `${SITE}${ACCOUNT[t.locale]}` },
    signature: l.sign,
  };
  return renderEmail(content, { lang: t.locale, email: t.email, why: l.why });
}

/** Réponse de l'équipe au client (aussi utilisée pour l'aperçu dans l'espace admin). */
export function buildSupportReply(t: SupportTicketInfo, answer: string) {
  const l = T[t.locale];
  const content: EmailContent = {
    subject: l.replySubject(t.ref),
    preheader: answer.replace(/\s+/g, ' ').slice(0, 110),
    title: l.replyTitle,
    intro: [esc(l.hello(firstName(t.name))), esc(l.replyIntro(t.ref))],
    quote: { label: l.answer, text: answer },
    note: l.followUp,
    facts: [
      { label: l.ref, value: t.ref },
      { label: l.reason, value: REASON[t.locale][t.reason] },
    ],
    cta: { label: l.cta, url: `${SITE}${ACCOUNT[t.locale]}` },
    signature: l.sign,
  };
  return renderEmail(content, { lang: t.locale, email: t.email, why: l.why });
}

/** Notification à l'équipe : nouveau dossier ou nouveau message du client. */
export function buildSupportAdmin(t: SupportTicketInfo, message: string, isNew: boolean) {
  const who = t.name?.trim() || t.email;
  const content: EmailContent = {
    subject: `[Fuseo support] ${isNew ? 'Nouveau dossier' : 'Nouveau message'} ${t.ref} · ${REASON_FR[t.reason]}`,
    preheader: `${who} : ${message.replace(/\s+/g, ' ').slice(0, 100)}`,
    title: isNew ? 'Nouvelle demande au support' : 'Le client a répondu',
    intro: [
      esc(`${who} ${isNew ? 'a ouvert un dossier' : 'a ajouté un message au dossier'} ${t.ref}.`),
    ],
    facts: [
      { label: 'Dossier', value: t.ref },
      { label: 'Motif', value: REASON_FR[t.reason] },
      { label: 'Client', value: who },
      { label: 'E-mail', value: t.email, href: `mailto:${t.email}` },
    ],
    quote: { label: 'Message', text: message },
    cta: { label: 'Répondre dans l’espace admin', url: `${SITE}/admin/support` },
    signature: 'Notification automatique du support Fuseo.',
  };
  return renderEmail(content, {
    lang: 'fr',
    why: 'Notification automatique du support de fuseo.net, envoyée à l’adresse administrateur.',
  });
}
