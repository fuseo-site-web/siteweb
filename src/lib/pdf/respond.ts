import { getTranslations } from 'next-intl/server';
import { NextResponse } from 'next/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { Translate } from '@/lib/plan-labels';
import { getPlanAccess } from '@/lib/access';
import { runPlan } from '@/lib/plan-view';
import type { PlanInput } from '@/lib/plan-schema';
import { buildPlanPdf } from './plan-pdf';

/** Calcule le plan (mêmes jours visibles que l'écran, selon le forfait ou le rôle) et le renvoie en PDF à télécharger. */
export async function planPdfResponse(input: PlanInput, localeParam: string | null) {
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;
  const { full } = await getPlanAccess();
  const plan = runPlan(input, locale, { full });
  if (!plan.ok) return NextResponse.json({ error: 'engine', codes: plan.codes }, { status: 422 });
  const t = (await getTranslations({ locale, namespace: 'planner' })) as unknown as Translate;
  const pdf = await buildPlanPdf({ plan, t, locale, generatedAt: new Date() });
  const slug = `${input.outbound[0]!.from}-${input.outbound[0]!.to}`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="fuseo-${slug}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
