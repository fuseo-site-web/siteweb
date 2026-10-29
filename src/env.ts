import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    AVIATIONSTACK_API_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    HEALTH_ENCRYPTION_KEY: z.string().min(40).optional(),
    HEALTH_ENCRYPTION_KEY_ID: z.string().min(1).default('k1'),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    // Mesure d'audience : chargée uniquement après consentement (voir components/consent).
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z
      .string()
      .regex(/^G-[A-Z0-9]{6,}$/)
      .optional(),
    NEXT_PUBLIC_CLARITY_PROJECT_ID: z
      .string()
      .regex(/^[a-z0-9]{8,12}$/)
      .optional(),
    // Jeton de vérification Search Console (balise meta) : public par nature.
    NEXT_PUBLIC_GSC_VERIFICATION: z.string().min(10).optional(),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AVIATIONSTACK_API_KEY: process.env.AVIATIONSTACK_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    HEALTH_ENCRYPTION_KEY: process.env.HEALTH_ENCRYPTION_KEY,
    HEALTH_ENCRYPTION_KEY_ID: process.env.HEALTH_ENCRYPTION_KEY_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_CLARITY_PROJECT_ID: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
    NEXT_PUBLIC_GSC_VERIFICATION: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
  },
});
