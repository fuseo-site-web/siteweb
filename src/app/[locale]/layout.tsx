import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConsentProvider } from '@/components/consent/ConsentProvider';
import { env } from '@/env';
import { routing } from '@/i18n/routing';
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

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
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

  return (
    <html lang={locale} className={montserrat.variable}>
      <body>
        <NextIntlClientProvider>
          <a href="#contenu" className="skip-link">
            {t('skip')}
          </a>
          <ConsentProvider>
            <SiteHeader />
            <main id="contenu">{children}</main>
            <SiteFooter />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
