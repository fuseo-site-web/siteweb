import { describe, expect, it } from 'vitest';
import { batchSchema } from '@/lib/analytics/events';
import {
  classifyOrigin,
  countryOf,
  isBot,
  localeOfPath,
  parseDevice,
} from '@/lib/analytics/source';

const own = 'fuseo.net';

describe("origine d'une visite", () => {
  it('reconnaît les assistants IA, par site référent ou par utm_source', () => {
    expect(classifyOrigin({ referrer: 'https://chatgpt.com/', ownHost: own })).toMatchObject({
      channel: 'ai',
      source: 'ChatGPT',
    });
    expect(
      classifyOrigin({ referrer: 'https://www.perplexity.ai/search?q=x', ownHost: own }),
    ).toMatchObject({ channel: 'ai', source: 'Perplexity' });
    expect(
      classifyOrigin({ referrer: 'https://gemini.google.com/app', ownHost: own }),
    ).toMatchObject({ channel: 'ai', source: 'Gemini' });
    expect(classifyOrigin({ referrer: 'https://claude.ai/', ownHost: own })).toMatchObject({
      channel: 'ai',
      source: 'Claude',
    });
    // ChatGPT ajoute utm_source=chatgpt.com, même sans en-tête référent.
    expect(classifyOrigin({ utm: { source: 'chatgpt.com' }, ownHost: own })).toMatchObject({
      channel: 'ai',
      source: 'ChatGPT',
    });
  });

  it('reconnaît Google et les autres moteurs, sans confondre Gemini avec Google', () => {
    expect(classifyOrigin({ referrer: 'https://www.google.com/', ownHost: own })).toMatchObject({
      channel: 'search',
      source: 'Google',
    });
    expect(classifyOrigin({ referrer: 'https://www.google.fr/', ownHost: own })).toMatchObject({
      channel: 'search',
      source: 'Google',
    });
    expect(classifyOrigin({ referrer: 'https://www.bing.com/', ownHost: own })).toMatchObject({
      channel: 'search',
      source: 'Bing',
    });
    expect(classifyOrigin({ referrer: 'https://gemini.google.com/', ownHost: own }).channel).toBe(
      'ai',
    );
  });

  it('classe les réseaux sociaux, les e-mails, les campagnes et les autres sites', () => {
    expect(
      classifyOrigin({ referrer: 'https://l.facebook.com/l.php', ownHost: own }),
    ).toMatchObject({ channel: 'social', source: 'Facebook' });
    expect(classifyOrigin({ referrer: 'https://t.co/abc', ownHost: own })).toMatchObject({
      channel: 'social',
      source: 'X (Twitter)',
    });
    expect(classifyOrigin({ utm: { source: 'nl', medium: 'email' }, ownHost: own })).toMatchObject({
      channel: 'email',
    });
    expect(
      classifyOrigin({ utm: { source: 'google', medium: 'cpc' }, ownHost: own }),
    ).toMatchObject({ channel: 'campaign' });
    expect(
      classifyOrigin({ referrer: 'https://blog.exemple.org/article', ownHost: own }),
    ).toMatchObject({ channel: 'referral', source: 'blog.exemple.org' });
  });

  it("compte « direct » sans origine ou depuis le site lui-même, et ne garde que l'hôte", () => {
    expect(classifyOrigin({ ownHost: own })).toMatchObject({
      channel: 'direct',
      referrerHost: null,
    });
    expect(classifyOrigin({ referrer: '', ownHost: own }).channel).toBe('direct');
    expect(classifyOrigin({ referrer: 'https://fuseo.net/blog', ownHost: own }).channel).toBe(
      'direct',
    );
    expect(
      classifyOrigin({ referrer: 'https://www.google.com/search?q=mon+vol+secret', ownHost: own })
        .referrerHost,
    ).toBe('google.com');
    expect(classifyOrigin({ referrer: 'pas une url', ownHost: own }).channel).toBe('direct');
  });
});

describe('appareil, robots, pays', () => {
  it("détecte l'appareil et le navigateur", () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseDevice(iphone)).toEqual({ device: 'mobile', browser: 'Safari' });
    const chrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    expect(parseDevice(chrome)).toEqual({ device: 'desktop', browser: 'Chrome' });
    expect(
      parseDevice(
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120',
      ).browser,
    ).toBe('Edge');
  });

  it('ignore les robots et navigateurs automatisés', () => {
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('Mozilla/5.0 HeadlessChrome/120')).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe(
      false,
    );
  });

  it('lit le pays Netlify et la langue de la page', () => {
    const geo = Buffer.from(JSON.stringify({ country: { code: 'fr' } })).toString('base64');
    expect(countryOf(new Headers({ 'x-nf-geo': geo }))).toBe('FR');
    expect(countryOf(new Headers({ 'x-nf-geo': 'n-importe-quoi' }))).toBeNull();
    expect(localeOfPath('/en/jet-lag-plan')).toBe('en');
    expect(localeOfPath('/es')).toBe('es');
    expect(localeOfPath('/blog')).toBe('fr');
  });
});

describe("lot d'événements", () => {
  const ids = {
    vid: '7b1f3c52-5d0e-4a8e-9a3b-2c6d1e4f8a90',
    sid: '0e2c9d44-8a52-4f0c-b0b4-7d1a6f3c9e11',
  };
  it('accepte un lot valide et refuse le reste', () => {
    expect(
      batchSchema.safeParse({ ...ids, events: [{ name: 'page_view', path: '/blog' }] }).success,
    ).toBe(true);
    expect(batchSchema.safeParse({ ...ids, events: [] }).success).toBe(false);
    expect(
      batchSchema.safeParse({ ...ids, events: [{ name: 'purchase', path: '/' }] }).success,
    ).toBe(false);
    expect(
      batchSchema.safeParse({
        ...ids,
        events: [{ name: 'page_view', path: 'https://evil.example' }],
      }).success,
    ).toBe(false);
    expect(
      batchSchema.safeParse({ vid: 'x', sid: 'y', events: [{ name: 'page_view', path: '/' }] })
        .success,
    ).toBe(false);
    expect(
      batchSchema.safeParse({
        ...ids,
        events: Array.from({ length: 21 }, () => ({ name: 'click', path: '/' })),
      }).success,
    ).toBe(false);
  });
});
