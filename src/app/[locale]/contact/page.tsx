import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactForm } from '@/components/contact/ContactForm';
import styles from '@/components/contact/Contact.module.css';
import { MapEmbed } from '@/components/map/MapEmbed';
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
  const home = await getTranslations({ locale, namespace: 'home2' });
  return (
    <>
      <PageHero
        title={t('title')}
        lead={t('lead')}
        icon="headphones"
        crumbs={[{ label: t('title') }]}
      />
      <div className={styles.layout}>
        <ContactForm />
        <aside className={styles.aside}>
          <section className={styles.next} aria-labelledby="contact-next">
            <h2 id="contact-next">{t('nextTitle')}</h2>
            <ol>
              <li>{t('next1')}</li>
              <li>{t('next2')}</li>
              <li>{t('next3')}</li>
            </ol>
          </section>
          <section className={styles.mapCard} aria-labelledby="contact-map">
            <h2 id="contact-map">{home('mapTitle')}</h2>
            <MapEmbed />
          </section>
        </aside>
      </div>
    </>
  );
}
