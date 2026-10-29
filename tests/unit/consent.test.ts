import { describe, expect, it } from 'vitest';
import {
  CONSENT_TTL_DAYS,
  clarityAllowed,
  makeConsent,
  parseConsent,
  readCookie,
  serializeConsent,
} from '@/lib/consent/consent';

const DAY = 86_400_000;
const ID = '7b1f3c52-5d0e-4a8e-9a3b-2c6d1e4f8a90';

describe('consentement', () => {
  it('relit un choix sérialisé', () => {
    const c = makeConsent(true, ID, 1_000_000);
    const raw = serializeConsent(c, true).split(';')[0]!.split('=')[1];
    expect(parseConsent(raw, 1_000_000 + DAY)).toEqual(c);
  });

  it('redemande au bout de 6 mois, ou si la version change, ou si le cookie est abîmé', () => {
    const c = makeConsent(true, ID, 0);
    const raw = encodeURIComponent(JSON.stringify(c));
    expect(parseConsent(raw, (CONSENT_TTL_DAYS - 1) * DAY)).not.toBeNull();
    expect(parseConsent(raw, (CONSENT_TTL_DAYS + 1) * DAY)).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify({ ...c, v: 'ancienne' })), 1)).toBeNull();
    expect(parseConsent('%E0%A4%A', 1)).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });

  it('lit un cookie par nom exact', () => {
    expect(readCookie('a=1; fuseo_consent=x; b=2', 'fuseo_consent')).toBe('x');
    expect(readCookie('xfuseo_consent=x', 'fuseo_consent')).toBeNull();
  });

  it("n'autorise jamais Clarity sur le plan, le compte et la connexion", () => {
    for (const p of ['/plan', '/compte', '/connexion', '/mot-de-passe', '/admin/x']) {
      expect(clarityAllowed(p)).toBe(false);
    }
    for (const p of ['/', '/blog', '/blog/lumiere', '/tarifs', '/planete']) {
      expect(clarityAllowed(p)).toBe(true);
    }
  });
});
