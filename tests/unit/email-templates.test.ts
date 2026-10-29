import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script ESM sans types
import { templates } from '../../scripts/build-email-templates.mjs';

const dir = join(__dirname, '..', '..', 'supabase', 'templates');
const ALLOWED = [
  /^\{\{ if eq \.Data\.locale "(en|es)" \}\}$/,
  /^\{\{ else if eq \.Data\.locale "es" \}\}$/,
  /^\{\{ else \}\}$/,
  /^\{\{ end \}\}$/,
  /^\{\{ \.(Email|NewEmail|RedirectTo|TokenHash) \}\}$/,
];

describe('modèles d’e-mails Supabase', () => {
  for (const name of Object.keys(templates)) {
    const html = readFileSync(join(dir, `${name}.html`), 'utf8');

    it(`${name} : seuls les marqueurs Supabase attendus sont utilisés`, () => {
      const markers = html.match(/\{\{[^}]*\}\}/g) ?? [];
      expect(markers.length).toBeGreaterThan(0);
      for (const m of markers)
        expect(
          ALLOWED.some((re) => re.test(m)),
          m,
        ).toBe(true);
    });

    it(`${name} : conditionnelles équilibrées`, () => {
      const opens = (html.match(/\{\{ if /g) ?? []).length;
      const ends = (html.match(/\{\{ end \}\}/g) ?? []).length;
      expect(opens).toBe(ends);
    });

    it(`${name} : lien de vérification serveur, logo absolu, pas de contenu de santé`, () => {
      expect(html).toContain('{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=');
      expect(html).toContain('src="https://fuseo.net/images/email/fuseo-logo.png"');
      expect(html).not.toMatch(/ConfirmationURL|sommeil de|trajet|vol /i);
    });
  }

  it('les fichiers générés sont à jour (relancer node scripts/build-email-templates.mjs)', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.html'));
    expect(files.sort()).toEqual(
      Object.keys(templates)
        .map((n) => `${n}.html`)
        .sort(),
    );
  });
});
