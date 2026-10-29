import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { PageHero } from '@/components/content/PageHero';
import { pageMetadata } from '@/lib/seo';

type Props = PageProps<'/[locale]/mot-de-passe'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return pageMetadata({
    locale,
    pathname: '/mot-de-passe',
    title: t('resetTitle'),
    description: t('resetLead'),
    noindex: true,
  });
}

export default async function NewPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <>
      <PageHero title={t('resetTitle')} lead={t('resetLead')} icon="key" />
      <NewPasswordForm />
    </>
  );
}
