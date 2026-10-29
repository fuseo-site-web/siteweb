'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveProfile } from '@/app/actions/account';
import { AirportField } from '@/components/planner/AirportField';
import planner from '@/components/planner/Planner.module.css';
import { ageFromBirthDate } from '@/lib/profile-schema';
import styles from './Dashboard.module.css';

export interface ProfileInitial {
  firstName: string;
  lastName: string;
  birthDate: string;
  country: string;
  homeAirport: string;
}

export function ProfileForm({
  email,
  initial,
  countries,
}: {
  email: string;
  initial: ProfileInitial;
  countries: Array<{ code: string; label: string }>;
}) {
  const t = useTranslations('account');
  const router = useRouter();
  const uid = useId();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<'idle' | 'saved' | 'invalid' | 'error'>('idle');
  const [pending, start] = useTransition();

  const age = v.birthDate ? ageFromBirthDate(v.birthDate) : null;
  const set = (k: keyof ProfileInitial) => (value: string) => {
    setV((p) => ({ ...p, [k]: value }));
    setState('idle');
  };

  return (
    <form
      className={styles.profile}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveProfile(v);
          setState(r.ok ? 'saved' : r.invalid ? 'invalid' : 'error');
          if (r.ok) router.refresh();
        });
      }}
    >
      <div className={planner.grid2}>
        <div className={`${planner.field} ${planner.wide}`}>
          <label htmlFor={`${uid}-email`}>{t('emailLabel')}</label>
          <input id={`${uid}-email`} value={email} readOnly aria-readonly="true" />
        </div>
        <div className={planner.field}>
          <label htmlFor={`${uid}-fn`}>{t('firstName')}</label>
          <input
            id={`${uid}-fn`}
            value={v.firstName}
            maxLength={80}
            autoComplete="given-name"
            onChange={(e) => set('firstName')(e.target.value)}
          />
        </div>
        <div className={planner.field}>
          <label htmlFor={`${uid}-ln`}>{t('lastName')}</label>
          <input
            id={`${uid}-ln`}
            value={v.lastName}
            maxLength={80}
            autoComplete="family-name"
            onChange={(e) => set('lastName')(e.target.value)}
          />
        </div>
        <div className={planner.field}>
          <label htmlFor={`${uid}-bd`}>
            {t('birthDate')}
            {age !== null && age >= 0 ? <> · {t('ageYears', { n: age })}</> : null}
          </label>
          <input
            id={`${uid}-bd`}
            type="date"
            value={v.birthDate}
            autoComplete="bday"
            onChange={(e) => set('birthDate')(e.target.value)}
          />
        </div>
        <div className={planner.field}>
          <label htmlFor={`${uid}-co`}>{t('country')}</label>
          <select
            id={`${uid}-co`}
            value={v.country}
            autoComplete="country"
            onChange={(e) => set('country')(e.target.value)}
          >
            <option value="">{t('countryNone')}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <AirportField
            label={t('homeAirport')}
            value={v.homeAirport}
            onChange={set('homeAirport')}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.save} disabled={pending}>
          {t('profileSave')}
        </button>
        <span
          role={state === 'invalid' || state === 'error' ? 'alert' : 'status'}
          className={state === 'saved' ? styles.okText : styles.errText}
        >
          {state === 'saved'
            ? t('profileUpdated')
            : state === 'invalid'
              ? t('profileInvalid')
              : state === 'error'
                ? t('error')
                : ''}
        </span>
      </div>
    </form>
  );
}
