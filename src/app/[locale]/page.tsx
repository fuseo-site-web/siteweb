import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Audience } from '@/components/home/Audience';
import { Hero } from '@/components/home/Hero';
import { PlanPreview } from '@/components/home/PlanPreview';
import { PressStrip } from '@/components/home/PressStrip';
import { Science } from '@/components/home/Science';
import { Steps } from '@/components/home/Steps';

export default function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <PressStrip />
      <PlanPreview />
      <Steps />
      <Science />
      <Audience />
    </>
  );
}
