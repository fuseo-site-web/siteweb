import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { buildNurturing, SEQUENCES, type SequenceId } from '@/lib/email/nurturing';
import { unsubscribeUrl, verifyUnsubscribe } from '@/lib/email/unsubscribe';

const LANGS = ['fr', 'en', 'es'] as const;
const art = (slug: string) => ({ slug, title: `Titre ${slug}`, excerpt: `Résumé ${slug}.` });
const articles = ['a', 'b', 'c', 'd'].map(art);

describe('séquences de nurturing', () => {
  it('existent dans les trois langues, avec identité visuelle, lien suivi et version texte', () => {
    for (const s of SEQUENCES) {
      for (const lang of LANGS) {
        const m = buildNurturing(s.id, lang, {
          firstName: 'Camille',
          articles,
          unsubscribeUrl: 'https://fuseo.net/api/unsubscribe?x=1',
        });
        expect(m.subject.length, `${s.id}/${lang}`).toBeGreaterThan(10);
        expect(m.html).toContain('https://fuseo.net/images/email/fuseo-logo.png');
        expect(m.html).toContain('#ffc857'); // bouton ambre
        expect(m.html).toContain('prefers-color-scheme: dark');
        expect(m.html).toContain(`lang="${lang}"`);
        expect(m.html).toMatch(/utm_medium=email&amp;utm_campaign=nurturing_/);
        expect(m.text).toContain('utm_medium=email');
      }
    }
  });

  it('ne met un lien de désinscription que dans les e-mails commerciaux', () => {
    for (const s of SEQUENCES) {
      const m = buildNurturing(s.id, 'fr', {
        articles,
        unsubscribeUrl: 'https://fuseo.net/api/unsubscribe?x=1',
      });
      expect(m.html.includes('api/unsubscribe'), s.id).toBe(s.kind === 'marketing');
    }
  });

  it('neutralise le prénom (aucune balise injectée)', () => {
    const m = buildNurturing('welcome', 'fr', { firstName: '<img src=x onerror=alert(1)>' });
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;img src=x');
  });

  it('ajoute les articles prévus : 3 pour la newsletter, 1 avant un voyage, aucun ailleurs', () => {
    const count = (id: SequenceId) =>
      (buildNurturing(id, 'fr', { articles }).html.match(/Lire l’article/g) ?? []).length;
    expect(count('newsletter')).toBe(3);
    expect(count('pre-trip')).toBe(1);
    expect(count('welcome')).toBe(0);
  });

  it('pointe vers les vraies adresses localisées du site', () => {
    const plan = routing.pathnames['/plan'] as Record<string, string>;
    const account = routing.pathnames['/compte'] as Record<string, string>;
    const contact = routing.pathnames['/contact'] as Record<string, string>;
    const pre = (l: (typeof LANGS)[number], p: string) => (l === 'fr' ? p : `/${l}${p}`);
    for (const l of LANGS) {
      expect(buildNurturing('welcome', l).html).toContain(
        `https://fuseo.net${pre(l, plan[l]!)}?utm_source`,
      );
      expect(buildNurturing('pre-trip', l, { articles }).html).toContain(
        `https://fuseo.net${pre(l, account[l]!)}?utm_source`,
      );
      expect(buildNurturing('post-trip', l).html).toContain(
        `https://fuseo.net${pre(l, contact[l]!)}?utm_source`,
      );
    }
  });
});

describe('lien de désinscription', () => {
  const secret = 'x'.repeat(40);
  it('se vérifie sans base de données et refuse toute falsification', () => {
    const u = new URL(unsubscribeUrl('https://fuseo.net', 'Camille@Example.com', secret, 'fr'));
    const e = u.searchParams.get('e');
    const t = u.searchParams.get('t');
    expect(e).toBe('camille@example.com');
    expect(verifyUnsubscribe(e, t, secret)).toBe(true);
    expect(verifyUnsubscribe('autre@example.com', t, secret)).toBe(false);
    expect(verifyUnsubscribe(e, 'faux', secret)).toBe(false);
    expect(verifyUnsubscribe(e, t, 'y'.repeat(40))).toBe(false);
    expect(verifyUnsubscribe(null, t, secret)).toBe(false);
  });
});
