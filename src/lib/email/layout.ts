/** Mise en page des e-mails Fuseo (nurturing) : épurée, responsive, mode sombre, aux couleurs du site. Pure : aucune dépendance serveur. */

export const SITE = 'https://fuseo.net';
export const LOGO = `${SITE}/images/email/fuseo-logo.png`;

export type Lang = 'fr' | 'en' | 'es';

export interface EmailContent {
  subject: string;
  preheader: string;
  title: string;
  intro: string[];
  steps?: Array<{ title: string; text: string }>;
  note?: string;
  /** Fiche d'informations : libellé / valeur (la valeur est affichée telle quelle, sans HTML). */
  facts?: Array<{ label: string; value: string; href?: string }>;
  /** Message cité (texte brut, retours à la ligne conservés). */
  quote?: { label: string; text: string };
  articles?: Array<{ title: string; excerpt: string; url: string; label: string }>;
  cta: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature: string;
}

export interface RenderOptions {
  lang: Lang;
  /** Adresse du destinataire, rappelée en pied de message. */
  email?: string;
  /** Présent pour les e-mails commerciaux : lien de désinscription obligatoire. */
  unsubscribeUrl?: string;
  /** Remplace la phrase « Vous recevez cet e-mail car… » du pied de message. */
  why?: string;
}

const FOOT: Record<
  Lang,
  {
    tagline: string;
    why: string;
    whyMarketing: string;
    unsub: string;
    disclaimer: string;
    by: string;
  }
> = {
  fr: {
    tagline: 'Votre plan anti-jet lag personnalisé, conçu avec l’Institut Médical du Sommeil.',
    why: 'Vous recevez cet e-mail car vous avez un compte Fuseo.',
    whyMarketing:
      'Vous recevez cet e-mail car vous avez un compte Fuseo ou vous êtes abonné(e) à nos conseils.',
    unsub: 'Se désinscrire',
    disclaimer:
      'Fuseo fournit des informations générales sur le sommeil et la chronobiologie du voyage. Il ne remplace pas l’avis d’un professionnel de santé.',
    by: 'Fuseo est édité par SLEEPTECHNOLOGY.',
  },
  en: {
    tagline: 'Your personalised anti-jet-lag plan, designed with the Institut Médical du Sommeil.',
    why: 'You are receiving this email because you have a Fuseo account.',
    whyMarketing:
      'You are receiving this email because you have a Fuseo account or subscribed to our tips.',
    unsub: 'Unsubscribe',
    disclaimer:
      'Fuseo provides general information on sleep and travel chronobiology. It does not replace the advice of a health professional.',
    by: 'Fuseo is published by SLEEPTECHNOLOGY.',
  },
  es: {
    tagline: 'Su plan antijet lag personalizado, diseñado con el Institut Médical du Sommeil.',
    why: 'Recibe este correo porque tiene una cuenta de Fuseo.',
    whyMarketing:
      'Recibe este correo porque tiene una cuenta de Fuseo o se suscribió a nuestros consejos.',
    unsub: 'Darse de baja',
    disclaimer:
      'Fuseo ofrece información general sobre el sueño y la cronobiología del viaje. No sustituye el consejo de un profesional de la salud.',
    by: 'Fuseo está editado por SLEEPTECHNOLOGY.',
  },
};

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const F = 'Helvetica,Arial,sans-serif';

const button = (label: string, url: string) => `
<table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="margin:6px 0 26px;">
  <tr><td align="center" bgcolor="#ffc857" style="border-radius:999px;background:#ffc857;">
    <a href="${esc(url)}" style="display:inline-block;padding:15px 32px;font-family:${F};font-size:16px;line-height:20px;font-weight:800;color:#4a3500;text-decoration:none;border-radius:999px;">${esc(label)}</a>
  </td></tr>
</table>`;

export function renderEmail(
  c: EmailContent,
  o: RenderOptions,
): { subject: string; html: string; text: string } {
  const f = FOOT[o.lang];
  const intro = c.intro
    .map(
      (p) =>
        `<p class="muted" style="margin:0 0 16px;font-size:16px;line-height:25px;color:#51647d;">${p}</p>`,
    )
    .join('');

  const steps = c.steps?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;">${c.steps
        .map(
          (s, i) => `
  <tr><td valign="top" width="44" style="padding:0 0 14px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="34" height="34" bgcolor="#0b2f55" style="width:34px;height:34px;border-radius:50%;background:#0b2f55;color:#ffc857;font-family:${F};font-size:15px;font-weight:800;line-height:34px;">${i + 1}</td></tr></table>
  </td><td valign="top" style="padding:0 0 14px;font-family:${F};">
    <p class="ink" style="margin:0 0 2px;font-size:16px;line-height:22px;font-weight:800;color:#0b2240;">${esc(s.title)}</p>
    <p class="muted" style="margin:0;font-size:14.5px;line-height:22px;color:#51647d;">${esc(s.text)}</p>
  </td></tr>`,
        )
        .join('')}</table>`
    : '';

  const facts = c.facts?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="box rule" style="margin:4px 0 20px;background:#f5f9fc;border:1px solid #d5e1ec;border-radius:14px;">${c.facts
        .map(
          (f) => `
  <tr><td style="padding:10px 16px 4px;font-family:${F};font-size:12px;line-height:16px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#51647d;" class="muted">${esc(f.label)}</td></tr>
  <tr><td style="padding:0 16px 10px;font-family:${F};font-size:15.5px;line-height:22px;font-weight:600;color:#0b2240;" class="ink">${f.href ? `<a class="lnk" href="${esc(f.href)}" style="color:#0d6f96;">${esc(f.value)}</a>` : esc(f.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  const quote = c.quote
    ? `<p class="muted" style="margin:0 0 6px;font-family:${F};font-size:12px;line-height:16px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#51647d;">${esc(c.quote.label)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td class="box" style="background:#fff8e6;border-left:4px solid #ffc857;border-radius:12px;padding:14px 16px;font-family:${F};font-size:15px;line-height:23px;color:#0b2240;white-space:pre-wrap;">${esc(c.quote.text)}</td></tr></table>`
    : '';

  const note = c.note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td class="box" style="background:#f5f9fc;border-left:4px solid #3cc0f0;border-radius:12px;padding:14px 16px;font-family:${F};">
    <p class="ink" style="margin:0;font-size:14.5px;line-height:22px;color:#0b2240;">${esc(c.note)}</p></td></tr></table>`
    : '';

  const articles = c.articles?.length
    ? c.articles
        .map(
          (a) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td class="box rule" style="background:#f5f9fc;border:1px solid #d5e1ec;border-radius:14px;padding:16px 18px;font-family:${F};">
  <p class="ink" style="margin:0 0 6px;font-size:16px;line-height:22px;font-weight:800;color:#0b2240;">${esc(a.title)}</p>
  <p class="muted" style="margin:0 0 10px;font-size:14px;line-height:21px;color:#51647d;">${esc(a.excerpt)}</p>
  <a class="lnk" href="${esc(a.url)}" style="font-size:14px;font-weight:800;color:#0d6f96;text-decoration:none;">${esc(a.label)} →</a>
</td></tr></table>`,
        )
        .join('')
    : '';

  const secondary = c.secondary
    ? `<p style="margin:0 0 20px;font-family:${F};font-size:14.5px;line-height:22px;"><a class="lnk" href="${esc(c.secondary.url)}" style="color:#0d6f96;font-weight:700;">${esc(c.secondary.label)}</a></p>`
    : '';

  const unsub = o.unsubscribeUrl
    ? ` · <a class="lnk" href="${esc(o.unsubscribeUrl)}" style="color:#0d6f96;text-decoration:underline;">${esc(f.unsub)}</a>`
    : '';

  const html = `<!doctype html>
<html lang="${o.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(c.subject)}</title>
<style>
  body { margin: 0; padding: 0; width: 100%; background: #eef4f9; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; }
  a { color: #0d6f96; }
  @media (max-width: 600px) {
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 23px !important; line-height: 29px !important; }
    .btn a { display: block !important; }
  }
  @media (prefers-color-scheme: dark) {
    body, .bg { background: #06162a !important; }
    .card { background: #0c223d !important; }
    .ink { color: #e7f0f9 !important; }
    .muted { color: #9db3cc !important; }
    .rule { border-color: #1f3d63 !important; }
    .box { background: #10294a !important; }
    a.lnk { color: #3cc0f0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef4f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#eef4f9;">${esc(c.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#eef4f9;">
<tr><td align="center" style="padding:28px 12px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
    <tr><td class="card" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(11,47,85,0.10);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td class="px" bgcolor="#061426" style="background:#061426;padding:22px 36px;">
          <a href="${SITE}" style="text-decoration:none;"><img src="${LOGO}" width="140" height="48" alt="fuseo" style="width:140px;height:48px;font:800 26px ${F};color:#ffffff;"></a>
        </td></tr>
        <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:#3cc0f0;background-image:linear-gradient(90deg,#3cc0f0,#ffc857);">&nbsp;</td></tr>
        <tr><td class="px" style="padding:36px 36px 10px;font-family:${F};">
          <h1 class="h1 ink" style="margin:0 0 16px;font-size:27px;line-height:33px;font-weight:800;color:#0b2240;letter-spacing:-0.4px;">${esc(c.title)}</h1>
          ${intro}${facts}${quote}${steps}${note}${articles}
          ${button(c.cta.label, c.cta.url)}
          ${secondary}
          <p class="muted" style="margin:0 0 26px;font-size:15px;line-height:23px;color:#51647d;">${esc(c.signature).replace(/\n/g, '<br>')}</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td class="px" align="center" style="padding:24px 20px 0;font-family:${F};">
      <p class="muted" style="margin:0 0 8px;font-size:13px;line-height:20px;color:#51647d;">${esc(f.tagline)}</p>
      <p class="muted" style="margin:0 0 8px;font-size:12px;line-height:18px;color:#7c8aa0;">${esc(o.why ?? (o.unsubscribeUrl ? f.whyMarketing : f.why))}${o.email ? ` (${esc(o.email)})` : ''}${unsub}</p>
      <p class="muted" style="margin:0 0 6px;font-size:11.5px;line-height:17px;color:#7c8aa0;">${esc(f.disclaimer)}</p>
      <p class="muted" style="margin:0;font-size:11.5px;line-height:17px;color:#7c8aa0;">${esc(f.by)} · <a class="lnk" href="${SITE}" style="color:#0d6f96;">fuseo.net</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;

  const text = [
    c.title,
    '',
    ...c.intro.map((p) => p.replace(/<[^>]+>/g, '')),
    ...(c.steps ?? []).map((s, i) => `${i + 1}. ${s.title} — ${s.text}`),
    ...(c.facts ?? []).map((f) => `${f.label} : ${f.value}`),
    ...(c.quote ? ['', `${c.quote.label} :`, c.quote.text] : []),
    ...(c.note ? ['', c.note] : []),
    ...(c.articles ?? []).flatMap((a) => ['', a.title, a.excerpt, `${a.label} : ${a.url}`]),
    '',
    `${c.cta.label} : ${c.cta.url}`,
    ...(c.secondary ? [`${c.secondary.label} : ${c.secondary.url}`] : []),
    '',
    c.signature,
    '',
    '—',
    f.tagline,
    f.disclaimer,
    ...(o.unsubscribeUrl ? [`${f.unsub} : ${o.unsubscribeUrl}`] : []),
  ].join('\n');

  return { subject: c.subject, html, text };
}
