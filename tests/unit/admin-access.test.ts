import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('@/env', () => ({
  env: { ADMIN_ACCESS_CODE: 'Jordan', ADMIN_SESSION_SECRET: 's'.repeat(40) },
}));

import {
  ADMIN_EMAIL,
  checkAdminCode,
  isAdminAccount,
  signAdminSession,
  verifyAdminSession,
} from '@/lib/admin/access';

const SECRET = 's'.repeat(40);
const USER = '11111111-2222-4333-8444-555555555555';

describe("accès à l'espace administrateur", () => {
  it('ne reconnaît que le compte administrateur prévu', () => {
    expect(ADMIN_EMAIL).toBe('contact.fuseo@gmail.com');
  });

  it('vérifie le code sans tenir compte de la casse ni des espaces, et refuse le reste', () => {
    expect(checkAdminCode('jordan')).toBe(true);
    expect(checkAdminCode('  JORDAN ')).toBe(true);
    expect(checkAdminCode('jordan2')).toBe(false);
    expect(checkAdminCode('')).toBe(false);
  });

  it('signe une session valable 2 heures, liée au compte', () => {
    const now = 1_000_000_000_000;
    const token = signAdminSession(USER, now, SECRET);
    expect(verifyAdminSession(token, USER, now + 3_600_000, SECRET)).toBe(true);
    expect(verifyAdminSession(token, USER, now + 2 * 3_600_000 + 1, SECRET)).toBe(false);
    expect(verifyAdminSession(token, '99999999-2222-4333-8444-555555555555', now, SECRET)).toBe(
      false,
    );
  });

  it('refuse un jeton falsifié, tronqué ou signé avec une autre clé', () => {
    const now = 1_000_000_000_000;
    const token = signAdminSession(USER, now, SECRET);
    const [payload] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: USER, e: now + 999_999_999_999 })).toString(
      'base64url',
    );
    expect(verifyAdminSession(`${forged}.${token.split('.')[1]}`, USER, now, SECRET)).toBe(false);
    expect(verifyAdminSession(payload, USER, now, SECRET)).toBe(false);
    expect(verifyAdminSession(undefined, USER, now, SECRET)).toBe(false);
    expect(verifyAdminSession(token, USER, now, 'x'.repeat(40))).toBe(false);
  });

  it("n'affiche le bouton d'accès qu'au compte administrateur, avec une adresse confirmée", () => {
    const ok = { email: 'Contact.Fuseo@gmail.com', email_confirmed_at: '2026-10-01T00:00:00Z' };
    expect(isAdminAccount(ok)).toBe(true);
    expect(isAdminAccount({ ...ok, email_confirmed_at: null })).toBe(false);
    expect(isAdminAccount({ ...ok, email: 'autre@gmail.com' })).toBe(false);
    expect(isAdminAccount({ email: null })).toBe(false);
  });
});
