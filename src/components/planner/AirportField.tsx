'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cityName, getAirport, searchAirports } from '@/lib/airports';
import styles from './Planner.module.css';

export function AirportField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const t = useTranslations('planner');
  const locale = useLocale();
  const id = useId();
  const selected = value ? getAirport(value) : undefined;
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const display = text ?? (selected ? `${selected.code} ${cityName(selected, locale)}` : '');
  const options = open ? searchAirports(text ?? '', locale) : [];
  const invalid = !!display && !selected && !open;

  const pick = (code: string) => {
    onChange(code);
    setText(null);
    setOpen(false);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={`${styles.combo} ${selected ? styles.ok : ''}`}>
        <input
          id={id}
          value={display}
          placeholder={t('placeholder')}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined}
          aria-invalid={invalid || undefined}
          onFocus={() => {
            setText(selected ? '' : (text ?? ''));
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
            if (value) onChange('');
          }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              setText((cur) => (selected ? null : cur));
            }, 120);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && options[active]) {
              e.preventDefault();
              pick(options[active].code);
            } else if (e.key === 'Escape') setOpen(false);
          }}
        />
        <span aria-hidden="true" className={styles.check}>
          ✓
        </span>
      </div>
      {open ? (
        <ul id={`${id}-list`} role="listbox" className={styles.list}>
          {options.length ? (
            options.map((a, i) => (
              <li
                key={a.code}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(a.code);
                }}
              >
                <b>{a.code}</b>
                <span>{a.name}</span>
              </li>
            ))
          ) : (
            <li className={styles.none}>{t('noAirport')}</li>
          )}
        </ul>
      ) : null}
      {invalid ? <p className={styles.hint}>{t('airportHint')}</p> : null}
    </div>
  );
}
