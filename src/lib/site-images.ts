import { env } from '@/env';

/** Visuels du site hébergés dans le bucket public Supabase `site-images` (WebP). */
export const HERO_IMAGE = {
  src: `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/site-images/hero-voyageuse-masque-sommeil-avion-fuseo.webp`,
  width: 1564,
  height: 1006,
} as const;
