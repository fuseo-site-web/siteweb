import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHero } from '@/components/content/PageHero';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { PlannerApp } from '@/components/planner/PlannerApp';
import { pageMetadata, summarize } from '@/lib/seo';

type Props = PageProps<'/[locale]/plan'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'planner' });
  return pageMetadata({
    locale,
    pathname: '/plan',
    title: t('title'),
    description: summarize(t('lead')),
  });
}

export default async function PlanPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'planner' });
  const pages = await getTranslations({ locale, namespace: 'pages' });
  return (
    <>
      <PageHero
        title={t('title')}
        lead={t('lead')}
        icon="plane"
        eyebrow={pages('sectionsMain')}
        crumbs={[{ label: pages('plan') }]}
      />
      <Suspense fallback={<div aria-busy="true" />}>
        <PlannerApp />
      </Suspense>
      <RelatedLinks keys={['method', 'science', 'pricing']} locale={locale} />
    </>
  );
}
