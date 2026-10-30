import { describe, expect, it } from 'vitest';
import { blocksToMarkdown, htmlToMd } from '@/lib/content-text';
import { timeZoneShift } from '@/lib/mcp/shift';

describe('texte des pages en Markdown', () => {
  it('convertit le HTML des pages sans rien laisser de balisé', () => {
    expect(
      htmlToMd(
        'Un <b>gras</b>, un <i>italique</i> et un <a href="/blog">lien</a> &amp; plus.',
        'https://fuseo.net',
      ),
    ).toBe('Un **gras**, un *italique* et un [lien](https://fuseo.net/blog) & plus.');
    expect(htmlToMd('<span>a</span><br>b')).toBe('a\nb');
  });

  it('met en forme titres, listes, cartes et images', () => {
    const md = blocksToMarkdown([
      { type: 'h', level: 2, text: 'Titre' },
      { type: 'p', text: 'Texte <b>fort</b>' },
      { type: 'list', ordered: true, items: ['un', 'deux'] },
      { type: 'list', ordered: false, items: ['a'] },
      { type: 'cards', items: [{ kicker: 'k', title: 'Carte', text: ['détail'] }] },
      { type: 'img', src: 'https://x/y.webp', alt: 'Soleil' },
    ]);
    expect(md).toContain('### Titre');
    expect(md).toContain('Texte **fort**');
    expect(md).toContain('1. un\n2. deux');
    expect(md).toContain('- a');
    expect(md).toContain('#### Carte');
    expect(md).toContain('![Soleil](https://x/y.webp)');
  });
});

describe('décalage horaire', () => {
  it('tient compte des changements d’heure', () => {
    expect(timeZoneShift('Europe/Paris', 'Asia/Tokyo', '2026-10-12')).toEqual({
      hours: 7,
      direction: 'east',
    });
    expect(timeZoneShift('Europe/Paris', 'Asia/Tokyo', '2026-12-12')).toEqual({
      hours: 8,
      direction: 'east',
    });
    expect(timeZoneShift('Europe/Paris', 'America/New_York', '2026-10-12')).toEqual({
      hours: -6,
      direction: 'west',
    });
    expect(timeZoneShift('Europe/Paris', 'Europe/Madrid', '2026-10-12')).toEqual({
      hours: 0,
      direction: 'none',
    });
  });
});
