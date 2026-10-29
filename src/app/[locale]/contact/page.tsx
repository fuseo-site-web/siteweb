import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactForm } from '@/components/contact/ContactForm';
import { PageHero } from '@/components/content/PageHero';
import { pageMetadata } from '@/lib/seo';

type Props = PageProps<'/[locale]/contact'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata({ locale, pathname: '/contact', title: t('title'), description: t('lead') });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });
  return (
    <>
      <PageHero
        title={t('title')}
        lead={t('lead')}
        icon="headphones"
        crumbs={[{ label: t('title') }]}
      />
      <ContactForm />
    </>
  );
}
