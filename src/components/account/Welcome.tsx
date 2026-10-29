import { Luggage, Plane, ShieldCheck, Timer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { ProfileForm, type ProfileInitial } from './ProfileForm';
import styles from './Welcome.module.css';

/** Première connexion : message de bienvenue puis informations du compte, avant l'accès à l'espace. */
export async function Welcome({
  locale,
  email,
  initial,
  countries,
  next,
}: {
  locale: string;
  email: string;
  initial: ProfileInitial;
  countries: Array<{ code: string; label: string }>;
  next: string | null;
}) {
  const t = await getTranslations({ locale, namespace: 'onboarding' });
  const perks = [
    { icon: Luggage, title: t('b1Title'), text: t('b1Text') },
    { icon: Timer, title: t('b2Title'), text: t('b2Text') },
    { icon: ShieldCheck, title: t('b3Title'), text: t('b3Text') },
  ];

  return (
    <div className={styles.wrap}>
      <section className={styles.hero} aria-labelledby="welcome-title">
        <div className={styles.sky} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37 + 11) % 97}%`,
                top: `${(i * 53 + 7) % 83}%`,
                animationDelay: `${(i % 5) * 0.7}s`,
              }}
            />
          ))}
          <svg className={styles.route} viewBox="0 0 400 120" preserveAspectRatio="none">
            <path d="M0 100C90 100 120 20 210 40S330 90 400 14" />
          </svg>
          <Plane className={styles.plane} size={22} />
        </div>
        <div className={styles.brand}>
          <FuseoMark size={34} />
          <b>fuseo</b>
        </div>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 id="welcome-title">{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <ul className={styles.perks}>
          {perks.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className={styles.chip} aria-hidden="true">
                <Icon size={18} />
              </span>
              <div>
                <b>{title}</b>
                <span>{text}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="welcome-form">
        <h2 id="welcome-form">{t('formTitle')}</h2>
        <p className={styles.note}>{t('formNote')}</p>
        <ProfileForm email={email} initial={initial} countries={countries} welcome={{ next }} />
      </section>
    </div>
  );
}
