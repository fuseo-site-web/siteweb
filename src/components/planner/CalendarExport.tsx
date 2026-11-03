'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buildPlanIcs } from '@/lib/plan-ics';
import { makePlanLabels, type Translate } from '@/lib/plan-labels';
import type { PlanResponse } from '@/lib/plan-view';

/** Ajoute les recommandations horaires à l'agenda du téléphone (fichier .ics : iPhone, Android, Outlook…). */
export function CalendarExport({
  plan,
  buttonClass,
}: {
  plan: PlanResponse;
  buttonClass?: string;
}) {
  const t = useTranslations('planner');
  const [done, setDone] = useState(false);

  async function run() {
    const { labelFor } = makePlanLabels(t as unknown as Translate);
    const title = t('icsTitle', { from: plan.home, to: plan.destination });
    const ics = buildPlanIcs({ plan, labelFor, title });
    const slug = `${plan.home}-${plan.destination}`
      .normalize('NFD')
      .replace(/[^\w-]/g, '')
      .toLowerCase();
    const file = new File([ics], `fuseo-${slug}.ics`, { type: 'text/calendar;charset=utf-8' });
    // Sur téléphone, la feuille de partage propose directement l'agenda ; sinon, téléchargement du fichier.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return setDone(true);
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDone(true);
  }

  return (
    <>
      <button type="button" className={buttonClass} onClick={() => void run()}>
        <CalendarPlus size={18} aria-hidden="true" />
        {t('icsButton')}
      </button>
      <span role="status" aria-live="polite">
        {done ? t('icsDone') : ''}
      </span>
    </>
  );
}
