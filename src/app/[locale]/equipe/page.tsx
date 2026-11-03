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

/** « Notre histoire » en quatre temps ; les numéros renvoient aux paragraphes team.storyN. */
const STORY_CHAPTERS = [
  { icon: 'stethoscope', parts: [1, 2] },
  { icon: 'bulb', parts: [3, 4] },
  { icon: 'brain', parts: [5, 6, 7] },
  { icon: 'plane', parts: [8] },
] as const;

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
      img: '/images/dr-jonathan-taieb.webp',
      bullets: 4,
    },
    {
      key: 'elbaz',
      name: 'Dr Maxime Elbaz',
      img: '/images/dr-maxime-elbaz.webp',
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
        knowsAbout: 'Sleep medicine',
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
      {/* Bandeau pleine largeur, comme les sections de l'accueil ; contenu aligné sur la largeur du site. */}
      <section className={styles.story} aria-labelledby="team-story">
        <div className={styles.storyInner}>
          <Reveal className={styles.sectionHead}>
            <span className={content.h2icon}>
              <Icon name="book" size={22} />
            </span>
            <div>
              <h2 id="team-story">{t('storyTitle')}</h2>
              <p className={styles.sub}>{t('storyLead')}</p>
            </div>
          </Reveal>
          {/* Le récit en quatre temps, comme les étapes de l'accueil : point de départ, constat, méthode, Fuseo. */}
          <ol className={styles.chapters}>
            {STORY_CHAPTERS.map((c, i) => (
              <Reveal as="li" key={c.icon} delay={i * 90} className={styles.chapter}>
                <span className={styles.chapterIcon} aria-hidden="true">
                  <Icon name={c.icon} size={22} />
                  <b>{i + 1}</b>
                </span>
                <h3>{t(`chapter${i + 1}`)}</h3>
                {c.parts.map((n) => (
                  <p key={n}>{t(`story${n}`)}</p>
                ))}
              </Reveal>
            ))}
          </ol>
          <Reveal className={styles.storyQuote}>
            <p>{t('story9')}</p>
            <strong>{t('story10')}</strong>
          </Reveal>
        </div>
      </section>
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
              <Image src={p.img} alt={p.name} width={240} height={240} unoptimized />
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

        <Reveal className={`${styles.sectionHead} ${styles.spaced}`}>
          <span className={content.h2icon}>
            <Icon name="sparkles" size={22} />
          </span>
          <h2>{t('scienceBehind')}</h2>
        </Reveal>
        <Reveal className={styles.scienceLink}>
          <p>{t('scienceBehindText')}</p>
          <Link href="/methode">
            {t('scienceBehindLink')} <Icon name="arrow-right" size={18} />
          </Link>
        </Reveal>

        <Reveal className={`${styles.sectionHead} ${styles.spaced}`}>
          <span className={content.h2icon}>
            <Icon name="stethoscope" size={22} />
          </span>
          <h2>{t('imsTitle')}</h2>
        </Reveal>
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
