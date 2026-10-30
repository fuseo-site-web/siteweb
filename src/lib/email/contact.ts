import { esc, renderEmail, SITE, type EmailContent, type Lang } from './layout';

/** E-mails du formulaire de contact : accusé de réception au visiteur, notification à l'administrateur. */

export type ContactKind = 'contact' | 'rdv' | 'pro';

export interface ContactInput {
  kind: ContactKind;
  name: string;
  email: string;
  phone?: string | null;
  slot?: string | null;
  subject: string;
  message: string;
  locale: Lang;
}

const utm = (path: string, c: string) =>
  `${SITE}${path}?utm_source=fuseo&utm_medium=email&utm_campaign=${c}`;
const PLAN: Record<Lang, string> = {
  fr: '/plan-anti-jet-lag',
  en: '/en/jet-lag-plan',
  es: '/es/plan-antijet-lag',
};
const BLOG: Record<Lang, string> = { fr: '/blog', en: '/en/blog', es: '/es/blog' };
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

const ACK: Record<
  Lang,
  {
    subject: string;
    preheader: string;
    title: string;
    hello: (n: string) => string;
    body: string;
    rdv: (slot: string) => string;
    quote: string;
    cta: string;
    secondary: string;
    sign: string;
  }
> = {
  fr: {
    subject: 'Merci de nous avoir contactés',
    preheader:
      'Votre message est bien arrivé : notre équipe revient vers vous dans les plus brefs délais.',
    title: 'Merci de nous avoir contactés',
    hello: (n) => (n ? `Bonjour ${n},` : 'Bonjour,'),
    body: 'Votre message est bien arrivé. Notre équipe va revenir vers vous dans les plus brefs délais.',
    rdv: (slot) =>
      `Créneau souhaité pour votre rendez-vous : ${slot}. Nous vous confirmerons l’horaire par e-mail.`,
    quote: 'Votre message',
    cta: 'Calculer mon plan anti-jet lag',
    secondary: 'Lire nos conseils sur le blog',
    sign: 'À très vite,\nL’équipe Fuseo',
  },
  en: {
    subject: 'Thank you for contacting us',
    preheader: 'Your message has arrived: our team will get back to you as soon as possible.',
    title: 'Thank you for contacting us',
    hello: (n) => (n ? `Hello ${n},` : 'Hello,'),
    body: 'Your message has arrived. Our team will get back to you as soon as possible.',
    rdv: (slot) =>
      `Preferred time for your appointment: ${slot}. We will confirm the time by email.`,
    quote: 'Your message',
    cta: 'Calculate my anti-jet-lag plan',
    secondary: 'Read our tips on the blog',
    sign: 'Speak soon,\nThe Fuseo team',
  },
  es: {
    subject: 'Gracias por contactarnos',
    preheader: 'Su mensaje ha llegado: nuestro equipo le responderá lo antes posible.',
    title: 'Gracias por contactarnos',
    hello: (n) => (n ? `Hola ${n},` : 'Hola,'),
    body: 'Su mensaje ha llegado. Nuestro equipo le responderá lo antes posible.',
    rdv: (slot) =>
      `Horario preferido para su cita: ${slot}. Le confirmaremos la hora por correo electrónico.`,
    quote: 'Su mensaje',
    cta: 'Calcular mi plan antijet lag',
    secondary: 'Leer nuestros consejos en el blog',
    sign: 'Hasta pronto,\nEl equipo de Fuseo',
  },
};

/** Accusé de réception envoyé au visiteur, dans sa langue. */
export function buildContactAck(c: ContactInput) {
  const t = ACK[c.locale];
  const content: EmailContent = {
    subject: t.subject,
    preheader: t.preheader,
    title: t.title,
    intro: [
      esc(t.hello(firstName(c.name))),
      esc(t.body),
      ...(c.kind === 'rdv' && c.slot ? [esc(t.rdv(c.slot))] : []),
    ],
    quote: { label: `${t.quote} : ${c.subject.replace(/\s+/g, ' ')}`, text: c.message },
    cta: { label: t.cta, url: utm(PLAN[c.locale], 'contact_ack') },
    secondary: { label: t.secondary, url: utm(BLOG[c.locale], 'contact_ack') },
    signature: t.sign,
  };
  const why = {
    fr: 'Vous recevez cet e-mail car vous nous avez écrit depuis fuseo.net.',
    en: 'You are receiving this email because you wrote to us from fuseo.net.',
    es: 'Recibe este correo porque nos escribió desde fuseo.net.',
  }[c.locale];
  return renderEmail(content, { lang: c.locale, email: c.email, why });
}

const KIND: Record<ContactKind, string> = {
  contact: 'Question',
  rdv: 'Demande de rendez-vous',
  pro: 'Fuseo Pro (entreprise)',
};
const LANG: Record<Lang, string> = { fr: 'Français', en: 'English', es: 'Español' };

/** Notification à l'administrateur : qui, pourquoi, et comment répondre. */
export function buildContactAdmin(c: ContactInput, receivedAt: Date) {
  const when = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(receivedAt);
  const panel = c.kind === 'contact' ? '/admin/demandes' : '/admin/leads';
  const subject = c.subject.replace(/\s+/g, ' ').slice(0, 120);
  const name = c.name.replace(/\s+/g, ' ');
  const content: EmailContent = {
    subject: `[Fuseo] ${KIND[c.kind]} : ${name} · ${subject}`,
    preheader: `${name} vous a écrit : ${subject}`,
    title:
      c.kind === 'rdv'
        ? 'Nouvelle demande de rendez-vous'
        : c.kind === 'pro'
          ? 'Nouvelle demande Fuseo Pro'
          : 'Nouveau message de contact',
    intro: [esc(`${c.name} vient de vous écrire depuis le formulaire de contact de fuseo.net.`)],
    facts: [
      { label: 'Type de demande', value: KIND[c.kind] },
      { label: 'Nom', value: c.name },
      { label: 'E-mail', value: c.email, href: `mailto:${c.email}` },
      ...(c.phone
        ? [{ label: 'Téléphone', value: c.phone, href: `tel:${c.phone.replace(/[^+\d]/g, '')}` }]
        : []),
      ...(c.slot ? [{ label: 'Créneau souhaité', value: c.slot }] : []),
      { label: 'Objet', value: subject },
      { label: 'Langue', value: LANG[c.locale] },
      { label: 'Reçu le', value: when },
    ],
    quote: { label: 'Message', text: c.message },
    cta: {
      label: `Répondre à ${firstName(c.name) || c.name}`,
      url: `mailto:${c.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`,
    },
    secondary: { label: 'Ouvrir la demande dans l’espace admin', url: `${SITE}${panel}` },
    signature: 'Répondre à cet e-mail écrit directement à la personne.',
  };
  return renderEmail(content, {
    lang: 'fr',
    why: 'Notification automatique du formulaire de contact de fuseo.net, envoyée à l’adresse administrateur.',
  });
}
