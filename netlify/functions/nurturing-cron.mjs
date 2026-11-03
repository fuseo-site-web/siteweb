// Fonction planifiée Netlify : toutes les heures, demande au site d'envoyer les e-mails de nurturing dus.
// Variables requises sur Netlify : CRON_SECRET (identique à celle du site). URL est fournie par Netlify.
const handler = async () => {
  if (!process.env.CRON_SECRET) return new Response('CRON_SECRET manquant', { status: 500 });
  const r = await fetch(`${process.env.URL}/api/cron/nurturing`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  return new Response(await r.text(), { status: r.status });
};

export default handler;

export const config = { schedule: '@hourly' };
