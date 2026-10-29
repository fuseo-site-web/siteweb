'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Source = { kind: 'input'; input: unknown } | { kind: 'trip'; id: string };
type State = 'idle' | 'busy' | 'fallback' | 'error';

/** Télécharger ou partager le plan en PDF (feuille de partage du téléphone : WhatsApp, e-mail, SMS…). */
export function PdfActions({
  source,
  buttonClass,
  compact = false,
}: {
  source: Source;
  buttonClass?: string;
  compact?: boolean;
}) {
  const t = useTranslations('planner');
  const account = useTranslations('account');
  const locale = useLocale();
  const [state, setState] = useState<State>('idle');

  async function fetchPdf(): Promise<File> {
    const r =
      source.kind === 'input'
        ? await fetch(`/api/plan/pdf?locale=${locale}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(source.input),
          })
        : await fetch(`/api/trips/${encodeURIComponent(source.id)}/pdf?locale=${locale}`);
    if (!r.ok) throw new Error(String(r.status));
    const name =
      /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ??
      'fuseo-plan.pdf';
    return new File([await r.blob()], name, { type: 'application/pdf' });
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function run(share: boolean) {
    setState('busy');
    try {
      const file = await fetchPdf();
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Fuseo', text: file.name });
        } catch (e) {
          if ((e as DOMException).name !== 'AbortError') throw e;
        }
        return setState('idle');
      }
      download(file);
      setState(share ? 'fallback' : 'idle');
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={state === 'busy'}
        onClick={() => void run(false)}
      >
        {state === 'busy' ? t('pdfBusy') : compact ? account('pdf') : t('pdf')}
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={state === 'busy'}
        onClick={() => void run(true)}
      >
        {compact ? account('share') : t('share')}
      </button>
      <span role="status" aria-live="polite">
        {state === 'fallback' ? t('shareFallback') : state === 'error' ? t('pdfError') : ''}
      </span>
    </>
  );
}
