import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import { Hero } from '@/components/home/Hero';
import { HomeFinale } from '@/components/home/HomeFinale';
import { JetLagImpact } from '@/components/home/JetLagImpact';
import { PlanPreview } from '@/components/home/PlanPreview';
import { Steps } from '@/components/home/Steps';
import { absoluteUrl, OG_IMAGE, pageMetadata } from '@/lib/seo';
import { HERO_IMAGE } from '@/lib/site-images';

export async function generateMetadata({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/', title: t('title'), description: t('description') });
}

export default function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations('hero');
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
      {
        '@type': 'ImageObject',
        '@id': `${url}#hero-image`,
        url: HERO_IMAGE.src,
        contentUrl: HERO_IMAGE.src,
        width: HERO_IMAGE.width,
        height: HERO_IMAGE.height,
        encodingFormat: 'image/webp',
        caption: t('imageCaption'),
        description: t('imageAlt'),
        inLanguage: locale,
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        isPartOf: { '@id': `${url}#website` },
        primaryImageOfPage: { '@id': `${url}#hero-image` },
        inLanguage: locale,
      },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <Hero />
      <JetLagImpact />
      <Steps />
      <PlanPreview />
      <HomeFinale locale={locale} />
    </>
  );
}
