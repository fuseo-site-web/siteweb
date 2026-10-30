import { env } from '@/env';
import { verifyUnsubscribe } from '@/lib/email/unsubscribe';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type L = 'fr' | 'en' | 'es';
const T: Record<L, Record<string, string>> = {
  fr: {
    title: 'Se désinscrire',
    ask: 'Confirmez-vous ne plus vouloir recevoir les e-mails de conseils de Fuseo à',
    btn: 'Me désinscrire',
    done: 'Vous êtes désinscrit(e).',
    doneText:
      'Vous ne recevrez plus nos e-mails de conseils. Les e-mails liés à votre compte ou à vos voyages continueront d’être envoyés.',
    bad: 'Ce lien n’est pas valide.',
    back: 'Retour sur Fuseo',
  },
  en: {
    title: 'Unsubscribe',
    ask: 'Do you confirm you no longer want to receive Fuseo tips emails at',
    btn: 'Unsubscribe me',
    done: 'You are unsubscribed.',
    doneText:
      'You will no longer receive our tips emails. Emails about your account or trips will still be sent.',
    bad: 'This link is not valid.',
    back: 'Back to Fuseo',
  },
  es: {
    title: 'Darse de baja',
    ask: '¿Confirma que ya no desea recibir los correos de consejos de Fuseo en',
    btn: 'Darme de baja',
    done: 'Se ha dado de baja.',
    doneText:
      'Ya no recibirá nuestros correos de consejos. Los correos sobre su cuenta o sus viajes se seguirán enviando.',
    bad: 'Este enlace no es válido.',
    back: 'Volver a Fuseo',
  },
};
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lang = (l: string | null): L => (l === 'en' || l === 'es' ? l : 'fr');

const page = (l: L, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Fuseo</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:#eef4f9;font-family:Helvetica,Arial,sans-serif;color:#0b2240}
main{max-width:460px;background:#fff;border-radius:20px;padding:32px;box-shadow:0 12px 40px rgba(11,47,85,.1)}h1{margin:0 0 12px;font-size:24px}p{line-height:1.6;color:#51647d}
button,a.b{display:inline-block;margin-top:8px;padding:14px 28px;border:0;border-radius:999px;background:#ffc857;color:#4a3500;font:800 16px Helvetica,Arial,sans-serif;text-decoration:none;cursor:pointer}
@media(prefers-color-scheme:dark){body{background:#06162a;color:#e7f0f9}main{background:#0c223d}p{color:#9db3cc}}</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    },
  );

/** Confirmation : un lien d'e-mail ne doit jamais désinscrire par simple affichage (les antivirus le suivent). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const l = lang(u.searchParams.get('l'));
  const t = T[l]!;
  const email = u.searchParams.get('e');
  if (
    !env.ADMIN_SESSION_SECRET ||
    !verifyUnsubscribe(email, u.searchParams.get('t'), env.ADMIN_SESSION_SECRET)
  ) {
    return page(
      l,
      `<h1>${t.title}</h1><p>${t.bad}</p><a class="b" href="${esc(env.NEXT_PUBLIC_SITE_URL)}">${t.back}</a>`,
      400,
    );
  }
  return page(
    l,
    `<h1>${t.title}</h1><p>${t.ask} <b>${esc(email!)}</b> ?</p><form method="post" action="/api/unsubscribe?${esc(u.searchParams.toString())}"><button type="submit">${t.btn}</button></form>`,
  );
}

/** Désinscription : depuis le bouton ci-dessus, ou en un clic depuis la messagerie (List-Unsubscribe-Post). */
export async function POST(req: Request) {
  const u = new URL(req.url);
  const l = lang(u.searchParams.get('l'));
  const t = T[l]!;
  const email = u.searchParams.get('e');
  if (!(await rateLimit(req, 'unsubscribe', 20, 3600))) {
    return page(l, `<h1>${t.title}</h1><p>${t.bad}</p>`, 429);
  }
  if (
    !env.ADMIN_SESSION_SECRET ||
    !verifyUnsubscribe(email, u.searchParams.get('t'), env.ADMIN_SESSION_SECRET) ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return page(l, `<h1>${t.title}</h1><p>${t.bad}</p>`, 400);
  }
  const db = createSupabaseAdminClient();
  const address = email!.trim().toLowerCase();
  const now = new Date().toISOString();
  const { data } = await db
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', address)
    .maybeSingle();
  const { error } = data
    ? await db
        .from('newsletter_subscribers')
        .update({ status: 'unsubscribed', unsubscribed_at: now })
        .eq('id', data.id)
    : await db.from('newsletter_subscribers').insert({
        email: address,
        status: 'unsubscribed',
        unsubscribed_at: now,
        source: 'unsubscribe-link',
      });
  if (error) return page(l, `<h1>${t.title}</h1><p>${t.bad}</p>`, 503);
  return page(
    l,
    `<h1>${t.done}</h1><p>${t.doneText}</p><a class="b" href="${esc(env.NEXT_PUBLIC_SITE_URL)}">${t.back}</a>`,
  );
}
