import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import { Audience } from '@/components/home/Audience';
import { Hero } from '@/components/home/Hero';
import { HomeFinale } from '@/components/home/HomeFinale';
import { PlanPreview } from '@/components/home/PlanPreview';
import { PressStrip } from '@/components/home/PressStrip';
import { Science } from '@/components/home/Science';
import { Steps } from '@/components/home/Steps';
import { absoluteUrl, OG_IMAGE, pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/', title: t('title'), description: t('description') });
}

export default function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const url = absoluteUrl('/', locale);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}#organization`,
        name: 'Fuseo',
        url,
        logo: OG_IMAGE.url.replace('og-fuseo.jpg', 'email/fuseo-logo.png'),
      },
      { '@type': 'WebSite', '@id': `${url}#website`, name: 'Fuseo', url, inLanguage: locale },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <Hero />
      <PressStrip />
      <PlanPreview />
      <Steps />
      <Science />
      <Audience />
      <HomeFinale locale={locale} />
    </>
  );
}
