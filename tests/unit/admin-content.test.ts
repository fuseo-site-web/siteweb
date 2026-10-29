import { describe, expect, it } from 'vitest';
import { parseMarkdown, readMinutes } from '@/lib/markdown';
import { imageFileName, slugify } from '@/lib/slug';

describe('adresses et noms de fichiers', () => {
  it('crée des adresses lisibles sans accents', () => {
    expect(slugify('Lumière du matin & jet lag : œuvre !')).toBe(
      'lumiere-du-matin-et-jet-lag-oeuvre',
    );
    expect(slugify('  --  ')).toBe('');
    expect(slugify('a'.repeat(200), 40)).toHaveLength(40);
  });

  it("nomme les images d'après l'article et leur description, avec un suffixe si le nom est pris", () => {
    expect(imageFileName('Comment la lumière réduit le jet lag', 'Lever de soleil au hublot')).toBe(
      'comment-la-lumiere-reduit-le-jet-lag-lever-de-soleil-au-hublot.webp',
    );
    expect(imageFileName('Titre', '', 2)).toBe('titre-illustration-2.webp');
    expect(imageFileName('', '')).toBe('illustration.webp');
  });
});

describe('Markdown des articles', () => {
  it('produit titres, paragraphes, listes et images', () => {
    const blocks = parseMarkdown(
      '## Titre\n\nUn **gras** et *italique*.\n\n- a\n- b\n\n1. un\n2. deux\n\n![Soleil](https://x.supabase.co/img.webp)',
    );
    expect(blocks.map((b) => b.type)).toEqual(['h', 'p', 'list', 'list', 'img']);
    expect(blocks[1]).toMatchObject({ text: 'Un <b>gras</b> et <i>italique</i>.' });
    expect(blocks[3]).toMatchObject({ type: 'list', ordered: true });
  });

  it('neutralise tout HTML et les liens dangereux', () => {
    const [p] = parseMarkdown(
      '<script>alert(1)</script> [clic](javascript:alert(1)) [ok](https://exemple.org)',
    );
    const html = (p as { text: string }).text;
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<a href="https://exemple.org" target="_blank" rel="noopener">ok</a>');
    expect(parseMarkdown('![x](javascript:alert(1))').some((b) => b.type === 'img')).toBe(false);
    expect(parseMarkdown('![x](//evil.example/a.png)').some((b) => b.type === 'img')).toBe(false);
  });

  it('estime la durée de lecture', () => {
    expect(readMinutes('mot '.repeat(10))).toBe(1);
    expect(readMinutes('mot '.repeat(1000))).toBe(5);
  });
});
