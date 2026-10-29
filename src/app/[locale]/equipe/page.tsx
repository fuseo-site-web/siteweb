import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import content from '@/components/content/Content.module.css';
import { CtaBand } from '@/components/content/CtaBand';
import { PageHero } from '@/components/content/PageHero';
import styles from '@/components/content/Pages.module.css';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { JsonLd } from '@/components/seo/JsonLd';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Link } from '@/i18n/navigation';
import { absoluteUrl, pageMetadata, summarize } from '@/lib/seo';

type Props = PageProps<'/[locale]/equipe'>;
const IMS_URL = 'https://institut-medical-sommeil.fr';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'team' });
  return pageMetadata({
    locale,
    pathname: '/equipe',
    title: t('title'),
    description: summarize(t('lead')),
  });
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'team' });
  const brand = await getTranslations({ locale, namespace: 'brand' });
  const pages = await getTranslations({ locale, namespace: 'pages' });

  const people = [
    {
      key: 'taieb',
      name: 'Dr Jonathan Taieb',
      img: '/images/dr-jonathan-taieb.jpg',
      bullets: 4,
    },
    {
      key: 'elbaz',
      name: 'Dr Maxime Elbaz',
      img: '/images/dr-maxime-elbaz.jpg',
      bullets: 3,
    },
  ];

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalOrganization',
        '@id': `${absoluteUrl('/', locale)}#ims`,
        name: 'Institut Médical du Sommeil',
        url: IMS_URL,
        medicalSpecialty: 'Sleep medicine',
      },
      {
        '@type': 'Person',
        name: 'Dr Jonathan Taieb',
        jobTitle: t('taieb.role'),
        worksFor: { '@id': `${absoluteUrl('/', locale)}#ims` },
        image: absoluteUrl('/', locale).replace(/\/$/, '') + '/images/dr-jonathan-taieb.jpg',
        url: absoluteUrl('/equipe', locale),
      },
      {
        '@type': 'Person',
        name: 'Dr Maxime Elbaz',
        jobTitle: t('elbaz.role'),
        image: absoluteUrl('/', locale).replace(/\/$/, '') + '/images/dr-maxime-elbaz.jpg',
        url: absoluteUrl('/equipe', locale),
      },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <PageHero
        title={t('title')}
        lead={t('lead')}
        icon="stethoscope"
        eyebrow={pages('sectionsMain')}
        crumbs={[{ label: pages('team') }]}
      />
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={content.h2icon}>
            <Icon name="badge-check" size={22} />
          </span>
          <div>
            <h2>{t('committee')}</h2>
            <p className={styles.sub}>{t('committeeSub')}</p>
          </div>
        </Reveal>
        <div className={styles.people}>
          {people.map((p) => (
            <Reveal key={p.key} className={styles.person}>
              <Image src={p.img} alt={p.name} width={240} height={240} />
              <div>
                <h3>{p.name}</h3>
                <p className={styles.role}>{t(`${p.key}.role`)}</p>
                <ul className={content.checks}>
                  {Array.from({ length: p.bullets }, (_, i) => (
                    <li key={i}>{t(`${p.key}.b${i + 1}`)}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className={styles.ims}>
          <span className={styles.logoChip}>
            <Image
              src="/images/institut-medical-du-sommeil.png"
              alt={brand('logoAlt')}
              width={351}
              height={120}
            />
          </span>
          <div>
            <p>{t('ims')}</p>
            <p>{t('address')}</p>
            <a href={IMS_URL} target="_blank" rel="noopener">
              institut-medical-sommeil.fr
            </a>
          </div>
        </Reveal>

        <Reveal className={`${styles.sectionHead} ${styles.spaced}`}>
          <span className={content.h2icon}>
            <Icon name="sparkles" size={22} />
          </span>
          <h2>{t('approach')}</h2>
        </Reveal>
        <div className={styles.grid3}>
          {(['book', 'stethoscope', 'eye'] as const).map((icon, i) => (
            <Reveal key={icon} delay={i * 90} className={styles.card}>
              <span className={content.cardIcon}>
                <Icon name={icon} size={22} />
              </span>
              <h3>{t(`a${i + 1}.t`)}</h3>
              <p>{t(`a${i + 1}.p`)}</p>
            </Reveal>
          ))}
        </div>
        <p className={styles.moreLink}>
          <Link href="/sources">
            {t('cta')}
            <Icon name="arrow-right" size={18} />
          </Link>
        </p>
      </div>
      <CtaBand locale={locale} />
      <RelatedLinks keys={['method', 'science', 'blog']} locale={locale} />
    </>
  );
}
