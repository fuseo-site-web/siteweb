import { env } from '@/env';

const SITE_HOST = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
const LOCAL_HOST = /^(localhost|127(\.\d+){3}|\[::1\]|.+\.localhost|.+\.local)$/;

/** Mesure uniquement sur le vrai domaine : ni en local, ni sur les aperçus de déploiement. */
export function measurable(): boolean {
  const h = location.hostname;
  return !LOCAL_HOST.test(h) && (h === SITE_HOST || h === `www.${SITE_HOST}`);
}
