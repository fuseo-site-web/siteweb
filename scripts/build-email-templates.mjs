// Génère les modèles d'e-mails d'authentification (Supabase Auth → Emails → Templates), envoyés via le SMTP Resend.
// Une seule mise en page ; les textes FR / EN / ES sont choisis par `user_metadata.locale` (défaut : français).
// Usage : node scripts/build-email-templates.mjs   → supabase/templates/*.html (+ subjects.json)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://fuseo.net';
const LOGO = `${SITE}/images/email/fuseo-logo.png`;
const out = join(import.meta.dirname, '..', 'supabase', 'templates');

/** Texte localisé : conditionnelle Go-template évaluée par Supabase à l'envoi. */
const L = ({ fr, en, es }) =>
  `{{ if eq .Data.locale "en" }}${en}{{ else if eq .Data.locale "es" }}${es}{{ else }}${fr}{{ end }}`;

// Lien de confirmation : /auth/confirm vérifie le jeton côté serveur (fonctionne depuis n'importe quel appareil).
const link = (type) => `{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=${type}`;

const common = {
  ignore: {
    fr: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez simplement ignorer cet e-mail : rien ne sera modifié.",
    en: 'If you did not request this, you can simply ignore this email: nothing will change.',
    es: 'Si no ha solicitado esto, simplemente ignore este correo: no se modificará nada.',
  },
  fallback: {
    fr: 'Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :',
    en: 'Button not working? Copy this link into your browser:',
    es: '¿No funciona el botón? Copie este enlace en su navegador:',
  },
  tagline: {
    fr: 'Votre plan anti-jet lag personnalisé, conçu avec l’Institut Médical du Sommeil.',
    en: 'Your personalised anti-jet-lag plan, designed with the Institut Médical du Sommeil.',
    es: 'Su plan antijet lag personalizado, diseñado con el Institut Médical du Sommeil.',
  },
  automatic: {
    fr: 'E-mail automatique envoyé à {{ .Email }}. Merci de ne pas y répondre.',
    en: 'Automatic email sent to {{ .Email }}. Please do not reply.',
    es: 'Correo automático enviado a {{ .Email }}. Por favor, no responda.',
  },
};

export const templates = {
  confirmation: {
    type: 'email',
    subject: 'Fuseo · Confirmez votre adresse e-mail',
    title: {
      fr: 'Confirmez votre adresse e-mail',
      en: 'Confirm your email address',
      es: 'Confirme su correo electrónico',
    },
    body: {
      fr: 'Bienvenue sur Fuseo. Un dernier geste : confirmez que <b>{{ .Email }}</b> est bien votre adresse pour activer votre compte et retrouver vos voyages sur tous vos appareils.',
      en: 'Welcome to Fuseo. One last step: confirm that <b>{{ .Email }}</b> is your address to activate your account and find your trips on all your devices.',
      es: 'Bienvenido a Fuseo. Un último paso: confirme que <b>{{ .Email }}</b> es su dirección para activar su cuenta y encontrar sus viajes en todos sus dispositivos.',
    },
    button: { fr: 'Confirmer mon adresse', en: 'Confirm my address', es: 'Confirmar mi dirección' },
  },
  magic_link: {
    type: 'email',
    subject: 'Fuseo · Votre lien de connexion',
    title: { fr: 'Votre lien de connexion', en: 'Your sign-in link', es: 'Su enlace de acceso' },
    body: {
      fr: 'Cliquez sur le bouton pour vous connecter à Fuseo avec <b>{{ .Email }}</b>. Aucun mot de passe n’est nécessaire.',
      en: 'Click the button to sign in to Fuseo with <b>{{ .Email }}</b>. No password needed.',
      es: 'Haga clic en el botón para iniciar sesión en Fuseo con <b>{{ .Email }}</b>. No necesita contraseña.',
    },
    button: { fr: 'Me connecter', en: 'Sign me in', es: 'Iniciar sesión' },
  },
  recovery: {
    type: 'recovery',
    subject: 'Fuseo · Réinitialisation de votre mot de passe',
    title: {
      fr: 'Réinitialisez votre mot de passe',
      en: 'Reset your password',
      es: 'Restablezca su contraseña',
    },
    body: {
      fr: 'Vous avez demandé à choisir un nouveau mot de passe pour votre compte Fuseo (<b>{{ .Email }}</b>).',
      en: 'You asked to choose a new password for your Fuseo account (<b>{{ .Email }}</b>).',
      es: 'Ha solicitado elegir una nueva contraseña para su cuenta de Fuseo (<b>{{ .Email }}</b>).',
    },
    button: {
      fr: 'Choisir un nouveau mot de passe',
      en: 'Choose a new password',
      es: 'Elegir una nueva contraseña',
    },
    ignore: {
      fr: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.',
      en: 'If you did not request this, ignore this email: your current password remains valid.',
      es: 'Si no ha solicitado esto, ignore este correo: su contraseña actual sigue siendo válida.',
    },
  },
  email_change: {
    type: 'email_change',
    subject: 'Fuseo · Confirmez votre nouvelle adresse e-mail',
    title: {
      fr: 'Confirmez votre nouvelle adresse',
      en: 'Confirm your new address',
      es: 'Confirme su nueva dirección',
    },
    body: {
      fr: 'Vous avez demandé à remplacer <b>{{ .Email }}</b> par <b>{{ .NewEmail }}</b> sur votre compte Fuseo.',
      en: 'You asked to replace <b>{{ .Email }}</b> with <b>{{ .NewEmail }}</b> on your Fuseo account.',
      es: 'Ha solicitado sustituir <b>{{ .Email }}</b> por <b>{{ .NewEmail }}</b> en su cuenta de Fuseo.',
    },
    button: { fr: 'Confirmer le changement', en: 'Confirm the change', es: 'Confirmar el cambio' },
  },
};

const render = (tpl) => {
  const t = (o) => L(o);
  const url = link(tpl.type);
  return `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${t(tpl.title)}</title>
<style>
  body { margin: 0; padding: 0; width: 100%; background: #eef4f9; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; }
  a { color: #0d6f96; }
  @media (max-width: 600px) {
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 22px !important; line-height: 28px !important; }
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#eef4f9;">${t(tpl.title)} — Fuseo&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#eef4f9;">
<tr><td align="center" style="padding:28px 12px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td class="card" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(11,47,85,0.10);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td class="px" bgcolor="#061426" style="background:#061426;padding:22px 36px;">
          <a href="${SITE}" style="text-decoration:none;">
            <img src="${LOGO}" width="140" height="48" alt="fuseo" style="width:140px;height:48px;font:800 26px Helvetica,Arial,sans-serif;color:#ffffff;">
          </a>
        </td></tr>
        <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:#3cc0f0;background-image:linear-gradient(90deg,#3cc0f0,#ffc857);">&nbsp;</td></tr>
        <tr><td class="px" style="padding:36px 36px 8px;font-family:Helvetica,Arial,sans-serif;">
          <h1 class="h1 ink" style="margin:0 0 14px;font-size:26px;line-height:32px;font-weight:800;color:#0b2240;letter-spacing:-0.3px;">${t(tpl.title)}</h1>
          <p class="muted" style="margin:0 0 28px;font-size:16px;line-height:25px;color:#51647d;">${t(tpl.body)}</p>
          <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td align="center" bgcolor="#ffc857" style="border-radius:999px;background:#ffc857;">
              <a href="${url}" style="display:inline-block;padding:15px 32px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:800;color:#4a3500;text-decoration:none;border-radius:999px;">${t(tpl.button)}</a>
            </td></tr>
          </table>
          <p class="muted" style="margin:0 0 20px;font-size:14px;line-height:22px;color:#51647d;">${t(tpl.ignore ?? common.ignore)}</p>
        </td></tr>
        <tr><td class="px" style="padding:0 36px 32px;font-family:Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="box" style="background:#f5f9fc;border-radius:12px;padding:14px 16px;">
            <p class="muted" style="margin:0 0 6px;font-size:12.5px;line-height:18px;color:#51647d;">${t(common.fallback)}</p>
            <a class="lnk" href="${url}" style="font-size:12.5px;line-height:18px;color:#0d6f96;word-break:break-all;">${url}</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td class="px" align="center" style="padding:24px 20px 0;font-family:Helvetica,Arial,sans-serif;">
      <p class="muted" style="margin:0 0 6px;font-size:13px;line-height:20px;color:#51647d;">${t(common.tagline)}</p>
      <p class="muted" style="margin:0;font-size:12px;line-height:18px;color:#7c8aa0;">${t(common.automatic)} · <a class="lnk" href="${SITE}" style="color:#0d6f96;">fuseo.net</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(out, { recursive: true });
  const subjects = {};
  for (const [name, tpl] of Object.entries(templates)) {
    writeFileSync(join(out, `${name}.html`), render(tpl));
    subjects[name] = tpl.subject;
  }
  writeFileSync(join(out, 'subjects.json'), JSON.stringify(subjects, null, 2) + '\n');
  console.log(`${Object.keys(templates).length} modèles → supabase/templates/`);
}
export { render };
