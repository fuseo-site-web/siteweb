import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import content from '@/components/content/Content.module.css';
import { PageHero } from '@/components/content/PageHero';
import styles from '@/components/content/Pages.module.css';
import { RelatedLinks } from '@/components/content/RelatedLinks';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Link } from '@/i18n/navigation';
import { pageMetadata, summarize } from '@/lib/seo';

type Props = PageProps<'/[locale]/tarifs'>;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return pageMetadata({
    locale,
    pathname: '/tarifs',
    title: t('title'),
    description: summarize(t('sub')),
  });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const pages = await getTranslations({ locale, namespace: 'pages' });
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: n % 1 ? 2 : 0,
    }).format(n);

  const icons: Record<string, IconName> = { free: 'sparkles', trip: 'plane', year: 'globe' };
  const offers = [
    {
      key: 'free',
      price: 0,
      unit: '',
      bullets: 3,
      fine: '',
      cta: 'free.cta',
      hot: false,
      image: '/images/pricing/decouverte-passeport.webp',
    },
    {
      key: 'trip',
      price: 8.9,
      unit: 'trip.unit',
      bullets: 4,
      fine: 'trip.fine',
      cta: 'trip.cta',
      hot: true,
      image: '/images/pricing/un-voyage-aile.webp',
    },
    {
      key: 'year',
      price: 79.9,
      unit: 'year.unit',
      bullets: 3,
      fine: '',
      cta: 'year.cta',
      hot: false,
      image: '/images/pricing/grand-voyageur-terre.webp',
    },
  ];

  return (
    <>
      <PageHero
        title={t('title')}
        lead={t('sub')}
        icon="tag"
        eyebrow={pages('sectionsMain')}
        crumbs={[{ label: pages('pricing') }]}
        visual="pricing"
      />
      <div className={`${styles.wrap} ${styles.pricingWrap}`}>
        <div className={styles.prices}>
          {offers.map((o, i) => (
            <Reveal
              key={o.key}
              delay={i * 90}
              className={`${styles.price} ${o.hot ? styles.hot : ''}`}
            >
              {o.hot ? <span className={styles.pill}>{t('popular')}</span> : null}
              <span className={content.cardIcon}>
                <Icon name={icons[o.key]!} size={22} />
              </span>
              <h2>{t(`${o.key}.name`)}</h2>
              <div className={styles.amount}>
                {money(o.price)} {o.unit ? <small>{t(o.unit)}</small> : null}
              </div>
              <ul className={content.checks}>
                {Array.from({ length: o.bullets }, (_, k) => (
                  <li key={k}>{t(`${o.key}.b${k + 1}`)}</li>
                ))}
              </ul>
              {o.fine ? <p className={styles.fine}>{t(o.fine)}</p> : null}
              <div className={styles.pricePhoto}>
                <Image
                  src={o.image}
                  alt={t(`${o.key}.imageAlt`)}
                  width={1100}
                  height={734}
                  sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1320px) 30vw, 390px"
                />
              </div>
              <Link href="/plan" className={`${styles.btn} ${o.hot ? '' : styles.navy}`}>
                {t(o.cta)}
                <Icon name="arrow-right" size={18} />
              </Link>
            </Reveal>
          ))}
        </div>
        <p className={styles.fine} style={{ marginTop: 24 }}>
          {t('soon')}
        </p>
        <p className={styles.sub} style={{ marginTop: 12 }}>
          {t('pro')} <Link href="/pro">{t('proLink')}</Link>.
        </p>
      </div>
      <RelatedLinks keys={['method', 'transparency', 'cgv']} locale={locale} />
    </>
  );
}
