import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { PageHero } from '@/components/content/PageHero';
import { pageMetadata } from '@/lib/seo';
import { LoginWithNext } from './login-with-next';

type Props = PageProps<'/[locale]/connexion'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return pageMetadata({
    locale,
    pathname: '/connexion',
    title: t('title'),
    description: t('lead'),
    noindex: true,
  });
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <>
      <PageHero title={t('title')} lead={t('lead')} icon="login" />
      <Suspense fallback={<LoginForm />}>
        <LoginWithNext />
      </Suspense>
    </>
  );
}
