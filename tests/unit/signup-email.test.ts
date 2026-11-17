import { describe, expect, it } from 'vitest';
import { buildPasswordReset, buildSignupCode, buildSignupExists } from '@/lib/email/verification';

describe('e-mail de code d’inscription', () => {
  for (const lang of ['fr', 'en', 'es'] as const) {
    it(`${lang} : le code à 8 chiffres est affiché en HTML et en texte, sans bouton`, () => {
      const m = buildSignupCode(lang, 'jane@example.com', '04821937');
      expect(m.html).toContain('04821937');
      expect(m.text).toContain('04821937');
      expect(m.subject).toMatch(/^Fuseo/);
      expect(m.html).not.toContain('class="btn"');
      expect(m.html).not.toContain('supabase');
    });

    it(`${lang} : l’e-mail « compte déjà existant » renvoie vers la connexion et ne contient aucun code`, () => {
      const m = buildSignupExists(lang, 'jane@example.com');
      expect(m.html).toContain('fuseo.net/');
      expect(m.html).not.toMatch(/\d{8}/);
    });
  }

  it('échappe le contenu', () => {
    const m = buildSignupCode('fr', 'a@b.fr', '<b>');
    expect(m.html).not.toContain('<b>');
  });

  for (const lang of ['fr', 'en', 'es'] as const) {
    it(`${lang} : l’e-mail de mot de passe oublié contient le lien vers le site`, () => {
      const url =
        'https://fuseo.net/auth/confirm?token_hash=abc&type=recovery&next=%2Fmot-de-passe';
      const m = buildPasswordReset(lang, 'jane@example.com', url);
      expect(m.html).toContain('token_hash=abc');
      expect(m.text).toContain(url);
      expect(m.subject).toMatch(/^Fuseo/);
      expect(m.html).not.toContain('supabase');
    });
  }
});
