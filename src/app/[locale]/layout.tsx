import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConsentProvider } from '@/components/consent/ConsentProvider';
import { WebMcp } from '@/components/seo/WebMcp';
import { env } from '@/env';
import { blogSlugMap } from '@/content/blog';
import { routing } from '@/i18n/routing';
import { OG_IMAGE, OG_LOCALE, SITE_ICONS } from '@/lib/seo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import '@/styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: '#0f223f' };

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    ...SITE_ICONS,
    title: t('title'),
    description: t('description'),
    // Valeurs par défaut du partage de lien (réseaux sociaux, messageries) pour toute page sans métadonnées propres.
    openGraph: {
      type: 'website',
      siteName: 'Fuseo',
      locale: OG_LOCALE[locale] ?? locale,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }] },
    ...(env.NEXT_PUBLIC_GSC_VERIFICATION && {
      verification: { google: env.NEXT_PUBLIC_GSC_VERIFICATION },
    }),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });
  const slugs = await blogSlugMap();

  return (
    <html lang={locale} className={montserrat.variable}>
      <body>
        <NextIntlClientProvider>
          <a href="#contenu" className="skip-link">
            {t('skip')}
          </a>
          <WebMcp />
          <ConsentProvider>
            <SiteHeader slugs={slugs} />
            <main id="contenu">{children}</main>
            <SiteFooter />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
