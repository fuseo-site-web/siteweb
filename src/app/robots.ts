import type { MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/admin/',
          '/mon-compte',
          '/connexion',
          '/nouveau-mot-de-passe',
          '/en/new-password',
          '/es/nueva-contrasena',
          '/en/account',
          '/en/sign-in',
          '/es/mi-cuenta',
          '/es/iniciar-sesion',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
