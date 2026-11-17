import { esc, renderEmail, SITE, type EmailContent, type Lang } from './layout';

/** E-mails d'inscription : code de vérification à 8 chiffres, et rappel « vous avez déjà un compte ». */

export const CODE_TTL_MIN = 15;

const LOGIN: Record<Lang, string> = {
  fr: '/connexion',
  en: '/en/sign-in',
  es: '/es/iniciar-sesion',
};

const T: Record<
  Lang,
  {
    subject: string;
    title: string;
    body: string;
    expires: string;
    ignore: string;
    sign: string;
    why: string;
    hello: string;
    existsSubject: string;
    existsTitle: string;
    existsBody: string;
    existsIgnore: string;
    existsCta: string;
  }
> = {
  fr: {
    subject: 'Fuseo · Votre code de vérification',
    title: 'Votre code de vérification',
    body: 'Bienvenue sur Fuseo. Saisissez ce code à 8 chiffres sur le site pour activer votre compte :',
    expires: `Ce code est valable ${CODE_TTL_MIN} minutes et ne sert qu’une seule fois.`,
    ignore:
      'Si vous n’êtes pas à l’origine de cette inscription, ignorez cet e-mail : aucun compte ne sera activé. Ne communiquez jamais ce code.',
    sign: 'À très vite,\nL’équipe Fuseo',
    why: 'Vous recevez cet e-mail car une inscription a été demandée sur fuseo.net avec cette adresse.',
    hello: 'Bonjour,',
    existsSubject: 'Fuseo · Vous avez déjà un compte',
    existsTitle: 'Vous avez déjà un compte Fuseo',
    existsBody:
      'Une inscription vient d’être demandée avec cette adresse, mais un compte Fuseo existe déjà. Connectez-vous avec votre mot de passe, ou utilisez « Mot de passe oublié » si besoin.',
    existsIgnore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.',
    existsCta: 'Me connecter',
  },
  en: {
    subject: 'Fuseo · Your verification code',
    title: 'Your verification code',
    body: 'Welcome to Fuseo. Enter this 8-digit code on the website to activate your account:',
    expires: `This code is valid for ${CODE_TTL_MIN} minutes and can only be used once.`,
    ignore:
      'If you did not sign up, ignore this email: no account will be activated. Never share this code.',
    sign: 'See you soon,\nThe Fuseo team',
    why: 'You are receiving this email because a sign-up was requested on fuseo.net with this address.',
    hello: 'Hello,',
    existsSubject: 'Fuseo · You already have an account',
    existsTitle: 'You already have a Fuseo account',
    existsBody:
      'A sign-up was just requested with this address, but a Fuseo account already exists. Sign in with your password, or use “Forgot password” if needed.',
    existsIgnore: 'If you did not make this request, ignore this email.',
    existsCta: 'Sign in',
  },
  es: {
    subject: 'Fuseo · Su código de verificación',
    title: 'Su código de verificación',
    body: 'Bienvenido a Fuseo. Introduzca este código de 8 dígitos en el sitio para activar su cuenta:',
    expires: `Este código es válido durante ${CODE_TTL_MIN} minutos y solo se puede usar una vez.`,
    ignore:
      'Si no se ha registrado usted, ignore este correo: no se activará ninguna cuenta. No comparta nunca este código.',
    sign: 'Hasta pronto,\nEl equipo de Fuseo',
    why: 'Recibe este correo porque se solicitó un registro en fuseo.net con esta dirección.',
    hello: 'Hola,',
    existsSubject: 'Fuseo · Ya tiene una cuenta',
    existsTitle: 'Ya tiene una cuenta de Fuseo',
    existsBody:
      'Se acaba de solicitar un registro con esta dirección, pero ya existe una cuenta de Fuseo. Inicie sesión con su contraseña o use «¿Olvidó su contraseña?» si lo necesita.',
    existsIgnore: 'Si no ha hecho esta solicitud, ignore este correo.',
    existsCta: 'Iniciar sesión',
  },
};

/** Code de vérification à saisir sur le site. */
export function buildSignupCode(lang: Lang, email: string, code: string) {
  const l = T[lang];
  const content: EmailContent = {
    subject: l.subject,
    preheader: `${code} · ${l.title}`,
    title: l.title,
    intro: [esc(l.hello), esc(l.body)],
    code,
    note: `${l.expires} ${l.ignore}`,
    signature: l.sign,
  };
  return renderEmail(content, { lang, email, why: l.why });
}

/** Réponse à une inscription faite avec une adresse déjà confirmée (sans révéler l'existence du compte sur le site). */
export function buildSignupExists(lang: Lang, email: string) {
  const l = T[lang];
  const content: EmailContent = {
    subject: l.existsSubject,
    preheader: l.existsBody,
    title: l.existsTitle,
    intro: [esc(l.hello), esc(l.existsBody), esc(l.existsIgnore)],
    cta: { label: l.existsCta, url: `${SITE}${LOGIN[lang]}` },
    signature: l.sign,
  };
  return renderEmail(content, { lang, email, why: l.why });
}

const RESET: Record<
  Lang,
  {
    subject: string;
    title: string;
    body: string;
    expires: string;
    ignore: string;
    cta: string;
    why: string;
    fallback: string;
  }
> = {
  fr: {
    subject: 'Fuseo · Réinitialisation de votre mot de passe',
    title: 'Choisissez un nouveau mot de passe',
    body: 'Vous avez demandé à réinitialiser le mot de passe de votre compte Fuseo. Cliquez sur le bouton pour en choisir un nouveau.',
    expires: 'Ce lien est valable 1 heure et ne sert qu’une seule fois.',
    ignore:
      'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.',
    cta: 'Choisir un nouveau mot de passe',
    why: 'Vous recevez cet e-mail suite à une demande de réinitialisation de mot de passe sur fuseo.net.',
    fallback: 'Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :',
  },
  en: {
    subject: 'Fuseo · Reset your password',
    title: 'Choose a new password',
    body: 'You asked to reset the password of your Fuseo account. Click the button to choose a new one.',
    expires: 'This link is valid for 1 hour and can only be used once.',
    ignore: 'If you did not request this, ignore this email: your current password stays valid.',
    cta: 'Choose a new password',
    why: 'You are receiving this email following a password reset request on fuseo.net.',
    fallback: 'Button not working? Copy this link into your browser:',
  },
  es: {
    subject: 'Fuseo · Restablezca su contraseña',
    title: 'Elija una nueva contraseña',
    body: 'Ha solicitado restablecer la contraseña de su cuenta de Fuseo. Haga clic en el botón para elegir una nueva.',
    expires: 'Este enlace es válido durante 1 hora y solo se puede usar una vez.',
    ignore:
      'Si no ha hecho esta solicitud, ignore este correo: su contraseña actual sigue siendo válida.',
    cta: 'Elegir una nueva contraseña',
    why: 'Recibe este correo tras una solicitud de restablecimiento de contraseña en fuseo.net.',
    fallback: '¿No funciona el botón? Copie este enlace en su navegador:',
  },
};

/** Mot de passe oublié : lien à usage unique qui ramène sur la page du site pour définir le nouveau mot de passe. */
export function buildPasswordReset(lang: Lang, email: string, url: string) {
  const l = RESET[lang];
  const content: EmailContent = {
    subject: l.subject,
    preheader: l.body,
    title: l.title,
    intro: [esc(T[lang].hello), esc(l.body), esc(l.expires)],
    note: l.ignore,
    cta: { label: l.cta, url },
    secondary: { label: l.fallback + ' ' + url, url },
    signature: T[lang].sign,
  };
  return renderEmail(content, { lang, email, why: l.why });
}
