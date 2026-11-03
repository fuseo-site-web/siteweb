import type { DayItem } from '@/lib/plan-view';

/** Fonction de traduction minimale, compatible avec useTranslations (client) et getTranslations (serveur). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Libellés d'un plan : partagés entre l'écran (ResultView) et le PDF pour qu'ils disent la même chose. */
export function makePlanLabels(t: Translate) {
  const labels: Record<string, string> = {
    sleep: t('itemSleep'),
    sleepf: t('itemSleepF'),
    wake: t('itemWake'),
    wind: t('itemWind'),
    seek: t('itemSeek'),
    avoid: t('itemAvoid'),
    caf: t('itemCaf'),
    cafok: t('itemCafOk'),
    alc: t('itemAlc'),
    alcno: t('itemAlcNo'),
    alcnone: t('itemAlcNone'),
    smoke: t('itemSmoke'),
    sport: t('itemSport'),
    sportcut: t('itemSportCut'),
    breakfast: t('itemBreakfast'),
    breakfast1: t('itemBreakfast1'),
    lunch: t('itemLunch'),
    dinner: t('itemDinner'),
    mealf: t('itemMealF'),
    meal1: t('itemMeal1'),
    meal: t('itemMeal'),
  };
  const labelFor = (it: DayItem) =>
    it.t === 'nap'
      ? t('itemNap', { n: it.n ?? 20 })
      : it.t === 'flight'
        ? t('itemFlight', { from: it.from ?? '', to: it.to ?? '' })
        : (labels[it.t] ?? it.t);
  const strategyLabel = (strategy: string) =>
    (
      ({
        FULL_ADAPTATION: t('stratFull'),
        PARTIAL_ADAPTATION: t('stratPartial'),
        HOME_TIME_MAINTENANCE: t('stratHomeTime'),
      }) as Record<string, string>
    )[strategy] ?? strategy;
  const dayTag = (kind: 'before' | 'flight' | 'stay') =>
    kind === 'flight' ? t('dayFlight') : kind === 'before' ? t('dayBefore') : '';
  return { labels, labelFor, strategyLabel, dayTag };
}
