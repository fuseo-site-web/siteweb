import { beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';

vi.mock('server-only', () => ({}));

beforeAll(() => {
  process.env.HEALTH_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  process.env.HEALTH_ENCRYPTION_KEY_ID = 'k1';
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test';
});

describe('chiffrement des données de santé', () => {
  it("chiffre puis déchiffre à l'identique, avec un IV différent à chaque appel", async () => {
    const { encryptJson, decryptJson } = await import('@/lib/crypto/health');
    const value = { bed: '23:00', wake: '07:00', note: 'données fictives' };
    const a = encryptJson(value);
    const b = encryptJson(value);
    expect(a).not.toBe(b);
    expect(a).not.toContain('23:00');
    expect(decryptJson(a)).toEqual(value);
  });

  it('détecte toute altération du texte chiffré', async () => {
    const { encryptJson, decryptJson } = await import('@/lib/crypto/health');
    const parts = encryptJson({ x: 1 }).split('.');
    parts[4] = parts[4]!.slice(0, -2) + (parts[4]!.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decryptJson(parts.join('.'))).toThrow();
  });

  it('refuse une clé inconnue', async () => {
    const { encryptJson, decryptJson } = await import('@/lib/crypto/health');
    const parts = encryptJson({ x: 1 }).split('.');
    parts[1] = 'k9';
    expect(() => decryptJson(parts.join('.'))).toThrow(/clé/);
  });
});
