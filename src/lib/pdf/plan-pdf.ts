import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { makePlanLabels, type Translate } from '@/lib/plan-labels';
import type { DayView, PlanResponse } from '@/lib/plan-view';
import { LOGO_PNG_BASE64 } from './logo';

const A4 = { w: 595.28, h: 841.89 };
const M = 40; // marges
const W = A4.w - 2 * M;
const BOTTOM = 56;

const hex = (h: string) =>
  rgb(...([1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]));
const C = {
  navy: hex('#061426'),
  ink: hex('#0b2240'),
  muted: hex('#51647d'),
  line: hex('#d5e1ec'),
  soft: hex('#f5f9fc'),
  sky: hex('#3cc0f0'),
  amber: hex('#ffc857'),
  amberSoft: hex('#fff6dd'),
  white: rgb(1, 1, 1),
};
const DOT: Record<string, ReturnType<typeof hex>> = {
  sleep: hex('#0b2f55'),
  sleepf: hex('#0b2f55'),
  wind: hex('#2f5f9e'),
  wake: hex('#3cc0f0'),
  seek: hex('#ffc857'),
  avoid: hex('#7c8aa0'),
  caf: hex('#8a5a2b'),
  cafok: hex('#8a5a2b'),
  nap: hex('#7b5cd6'),
  flight: hex('#3cc0f0'),
};

/** Polices PDF standard : on ne garde que les caractères qu'elles savent écrire (accents FR/ES inclus, pas d'emoji). */
function makeSafe(font: PDFFont) {
  const ok = new Set(font.getCharacterSet());
  return (text: string) =>
    [...text.replaceAll('→', '›').replace(/[  ]/g, ' ').replaceAll('≈', '~')]
      .filter((ch) => ok.has(ch.codePointAt(0)!))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
}

const SEG: Record<string, { color: ReturnType<typeof hex>; opacity?: number; inset?: number }> = {
  sleep: { color: hex('#0b2f55') },
  sleepf: { color: hex('#0b2f55'), opacity: 0.75 },
  seek: { color: hex('#ffc857') },
  nap: { color: hex('#3cc0f0'), opacity: 0.7, inset: 5 },
  wind: { color: hex('#b9c6f0'), inset: 5 },
  cafok: { color: hex('#8a5a2b'), opacity: 0.55 },
};
const AVOID = hex('#7c8aa0');
const BAR_H = 18;

export interface PlanPdfOptions {
  plan: PlanResponse;
  t: Translate;
  locale: string;
  generatedAt: Date;
}

export async function buildPlanPdf({
  plan,
  t,
  locale,
  generatedAt,
}: PlanPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const safe = makeSafe(regular);
  const { labelFor, strategyLabel, dayTag } = makePlanLabels(t);

  const title = `${plan.home} › ${plan.destination}`;
  doc.setTitle(`Fuseo – ${safe(title)}`);
  doc.setAuthor('Fuseo');
  doc.setCreator('fuseo.net');
  doc.setProducer('Fuseo');
  doc.setLanguage(locale);
  doc.setCreationDate(generatedAt);

  let page!: PDFPage;
  let y = 0;

  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    let line = '';
    for (const word of safe(text).split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const text = (s: string, x: number, yy: number, size: number, font = regular, color = C.ink) =>
    page.drawText(safe(s), { x, y: yy, size, font, color });
  const para = (
    s: string,
    x: number,
    size: number,
    width: number,
    color = C.muted,
    font = regular,
    lead = 1.45,
  ) => {
    for (const line of wrap(s, font, size, width)) {
      y -= size * lead;
      page.drawText(line, { x, y, size, font, color });
    }
  };

  const newPage = (first = false) => {
    page = doc.addPage([A4.w, A4.h]);
    if (first) {
      page.drawRectangle({ x: 0, y: A4.h - 84, width: A4.w, height: 84, color: C.navy });
      page.drawImage(logo, { x: M, y: A4.h - 62, width: 116, height: 40 });
      const tag = safe(t('pdfTitle'));
      page.drawText(tag, {
        x: A4.w - M - bold.widthOfTextAtSize(tag, 9.5),
        y: A4.h - 46,
        size: 9.5,
        font: bold,
        color: C.sky,
      });
      page.drawRectangle({ x: 0, y: A4.h - 88, width: A4.w / 2, height: 4, color: C.sky });
      page.drawRectangle({ x: A4.w / 2, y: A4.h - 88, width: A4.w / 2, height: 4, color: C.amber });
      y = A4.h - 88 - 30;
    } else {
      page.drawRectangle({ x: 0, y: A4.h - 30, width: A4.w, height: 30, color: C.navy });
      page.drawImage(logo, { x: M, y: A4.h - 25, width: 58, height: 20 });
      y = A4.h - 30 - 30;
    }
  };
  const ensure = (h: number) => {
    if (y - h < BOTTOM) newPage();
  };

  /** Frise de la journée (mêmes segments et couleurs qu'à l'écran) : barre, vols au-dessus, repères horaires dessous. */
  const drawTimeline = (d: DayView, x: number, top: number, width: number) => {
    const bottom = top - BAR_H;
    page.drawRectangle({
      x,
      y: bottom,
      width,
      height: BAR_H,
      color: C.soft,
      borderColor: C.line,
      borderWidth: 0.7,
    });

    for (const seg of d.segs) {
      const sx = x + seg.a * width;
      const sw = Math.max((seg.b - seg.a) * width, 1.5);
      if (seg.t === 'flight') {
        page.drawRectangle({ x: sx, y: top + 1.5, width: sw, height: 3, color: C.sky });
      } else if (seg.t === 'avoid') {
        page.drawRectangle({
          x: sx,
          y: bottom,
          width: sw,
          height: BAR_H,
          color: hex('#e9edf3'),
          borderColor: AVOID,
          borderWidth: 0.8,
        });
        // hachures à 45°, coupées aux bords du segment
        for (let hx = sx - BAR_H; hx < sx + sw; hx += 4.5) {
          const x0 = Math.max(hx, sx);
          const x1 = Math.min(hx + BAR_H, sx + sw);
          if (x1 <= x0) continue;
          page.drawLine({
            start: { x: x0, y: bottom + (x0 - hx) },
            end: { x: x1, y: bottom + (x1 - hx) },
            thickness: 0.7,
            color: AVOID,
          });
        }
      } else {
        const st = SEG[seg.t];
        if (!st) continue;
        const inset = st.inset ?? 0;
        page.drawRectangle({
          x: sx,
          y: bottom + inset,
          width: sw,
          height: BAR_H - 2 * inset,
          color: st.color,
          opacity: st.opacity ?? 1,
        });
      }
    }
    for (const m of d.marks) {
      const cx = x + m.a * width;
      page.drawCircle({ x: cx, y: bottom + BAR_H / 2, size: 4.4, color: C.white });
      page.drawCircle({
        x: cx,
        y: bottom + BAR_H / 2,
        size: 3.2,
        color: hex('#8a5a2b'),
        opacity: m.t === 'cafok' ? 0.6 : 1,
      });
    }
    for (let h = Math.ceil(d.startH / 6) * 6; h < d.startH + d.lenH - 0.5; h += 6) {
      const tx = x + ((h - d.startH) / d.lenH) * width;
      const label = `${h % 24} h`;
      page.drawLine({
        start: { x: tx, y: bottom },
        end: { x: tx, y: bottom - 3 },
        thickness: 0.5,
        color: C.muted,
      });
      page.drawText(label, {
        x: tx - regular.widthOfTextAtSize(label, 7) / 2,
        y: bottom - 11,
        size: 7,
        font: regular,
        color: C.muted,
      });
    }
  };

  newPage(true);

  // Titre et ligne de synthèse
  y -= 6;
  page!.drawText(safe(title), { x: M, y: y - 22, size: 24, font: bold, color: C.ink });
  y -= 30;
  const shift = Math.abs(plan.shiftHours);
  const summary =
    shift < 0.5
      ? t('noShift')
      : `${t('shiftLine', { hours: shift.toLocaleString(locale), direction: plan.shiftHours > 0 ? t('shiftEast') : t('shiftWest') })} · ${strategyLabel(plan.strategy)} · ${plan.direction === 'ADVANCE' ? t('advance') : t('delay')}`;
  para(summary, M, 11, W, C.muted);
  y -= 14;

  // Tableau de bord à l'arrivée
  if (plan.arrival) {
    const a = plan.arrival;
    const boxes: Array<[string, string, string]> = [
      [t('bodyClock'), a.bodyClock.time, a.bodyClock.city],
      [t('localTime'), a.localClock.time, a.localClock.city],
      [t('residual'), a.estimatedResidualJetLag.label, ''],
      [t('adaptation'), `${a.adaptation} %`, ''],
    ];
    const gap = 8;
    const bw = (W - gap * 3) / 4;
    boxes.forEach(([label, value, sub], i) => {
      const x = M + i * (bw + gap);
      page.drawRectangle({
        x,
        y: y - 56,
        width: bw,
        height: 56,
        color: C.soft,
        borderColor: C.line,
        borderWidth: 0.8,
      });
      text(label, x + 9, y - 15, 7.5, bold, C.muted);
      text(value, x + 9, y - 34, value.length > 9 ? 12 : 17, bold, C.ink);
      if (sub) text(sub, x + 9, y - 48, 7.5, regular, C.muted);
    });
    y -= 56 + 22;
  }

  // Les 4 règles
  ensure(110);
  text(t('rules'), M, y, 12.5, bold, C.ink);
  y -= 4;
  const rules: Array<[string, ReturnType<typeof hex>]> = [
    [t('rule1'), C.amber],
    [t('rule2'), hex('#7c8aa0')],
    [t('rule3'), hex('#0b2f55')],
    [t('rule4'), hex('#8a5a2b')],
  ];
  for (const [r, color] of rules) {
    const before = y;
    para(r.replace(/,\s*$/, '.'), M + 16, 10, W - 16, C.ink);
    page.drawCircle({ x: M + 4, y: before - 10 * 1.45 + 3.2, size: 3.4, color });
  }
  y -= 10;

  // Jours
  for (const d of plan.days) {
    const rows = Math.max(d.list.length, 1);
    ensure(34 + BAR_H + 34 + Math.min(rows, 3) * 16);
    const date = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${d.date}T12:00:00Z`));
    const heading = date.charAt(0).toUpperCase() + date.slice(1);
    page.drawRectangle({
      x: M,
      y: y - 16,
      width: 3.5,
      height: 18,
      color: d.kind === 'flight' ? C.sky : C.amber,
    });
    text(heading, M + 12, y - 11, 12.5, bold, C.ink);
    const tag = dayTag(d.kind);
    if (tag) {
      const tw = bold.widthOfTextAtSize(safe(tag), 8) + 14;
      const tx = M + W - tw;
      page.drawRectangle({
        x: tx,
        y: y - 15,
        width: tw,
        height: 16,
        color: d.kind === 'flight' ? C.sky : C.amberSoft,
      });
      text(tag, tx + 7, y - 10, 8, bold, C.navy);
    }
    y -= 22;
    if (d.noon) {
      const n = d.noon;
      const line = `${t('bodyClock')} ${n.bodyClock.time} · ${t('localTime')} ${n.localClock.time} · ${t('adaptation')} ${n.adaptation} %${n.alertness != null ? ` · ${t('alertness')} ${n.alertness}/100` : ''}`;
      para(line, M + 12, 8.5, W - 12, C.muted);
      y -= 3;
    }
    y -= 10; // place pour les vols, au-dessus de la barre
    drawTimeline(d, M + 12, y, W - 12);
    y -= BAR_H + 22;
    for (const it of d.list) {
      ensure(18);
      y -= 16;
      const range = it.end ? `${it.at} – ${it.end}` : it.at;
      text(range, M + 12, y + 3, 10.5, bold, C.ink);
      page.drawCircle({ x: M + 104, y: y + 6, size: 3.6, color: DOT[it.t] ?? C.sky });
      text(labelFor(it), M + 116, y + 3, 10.5, regular, C.ink);
      page.drawLine({
        start: { x: M + 12, y: y - 4 },
        end: { x: M + W, y: y - 4 },
        thickness: 0.4,
        color: C.line,
      });
    }
    y -= 14;
  }

  // Jours verrouillés
  if (plan.lockedDays > 0) {
    const lines = wrap(t('lockedText'), regular, 9.5, W - 28);
    const h = 40 + lines.length * 13;
    ensure(h + 10);
    page.drawRectangle({
      x: M,
      y: y - h,
      width: W,
      height: h,
      color: C.amberSoft,
      borderColor: C.amber,
      borderWidth: 0.8,
    });
    text(t('lockedTitle', { n: plan.lockedDays }), M + 14, y - 20, 11.5, bold, C.ink);
    let ly = y - 20;
    for (const l of lines) {
      ly -= 13;
      page.drawText(l, { x: M + 14, y: ly, size: 9.5, font: regular, color: C.muted });
    }
    text('fuseo.net/tarifs', M + 14, y - h + 10, 9, bold, hex('#0d6f96'));
    y -= h + 16;
  }

  // Avertissement
  ensure(48);
  para(t('disclaimer'), M, 8, W, C.muted);

  // Pieds de page : lien, date, pagination
  const pages = doc.getPages();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(generatedAt);
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 36 }, end: { x: M + W, y: 36 }, thickness: 0.5, color: C.line });
    p.drawText(safe(`fuseo.net · ${t('pdfGenerated', { date: when })}`), {
      x: M,
      y: 22,
      size: 8,
      font: regular,
      color: C.muted,
    });
    const label = `${i + 1} / ${pages.length}`;
    p.drawText(label, {
      x: M + W - regular.widthOfTextAtSize(label, 8),
      y: 22,
      size: 8,
      font: regular,
      color: C.muted,
    });
  });

  return doc.save();
}
