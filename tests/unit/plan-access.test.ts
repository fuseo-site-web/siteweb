import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const cookieValue = { v: undefined as string | undefined };
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue.v ? { value: cookieValue.v } : undefined) }),
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));

import { getPlanAccess } from '@/lib/access';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const USER = {
  id: '11111111-2222-4333-8444-555555555555',
  email: 'pilote@exemple.fr',
  email_confirmed_at: '2026-10-01T00:00:00Z',
};

/** Rôle en base (null = aucune ligne) et forfaits actifs du compte connecté. */
function setup(role: string | null, activeEntitlements = 0) {
  const roles = {
    from: () => roles,
    select: () => roles,
    eq: () => roles,
    maybeSingle: async () => ({ data: role ? { role } : null }),
  };
  vi.mocked(createSupabaseAdminClient).mockReturnValue(roles as never);
  const ents = {
    from: () => ents,
    select: () => ents,
    eq: () => ents,
    or: () => ents,
    limit: async () => ({
      data: Array.from({ length: activeEntitlements }, (_, i) => ({ id: i })),
    }),
  };
  vi.mocked(getCurrentUser).mockResolvedValue({ supabase: ents, user: USER } as never);
}

describe('accès au plan selon le rôle, le forfait et la simulation admin', () => {
  beforeEach(() => {
    cookieValue.v = undefined;
  });

  it('client gratuit : jours limités ; client avec forfait actif : plan complet', async () => {
    setup(null, 0);
    expect((await getPlanAccess()).full).toBe(false);
    setup('client', 1);
    expect((await getPlanAccess()).full).toBe(true);
  });

  it('testeur et admin : plan complet sans forfait', async () => {
    setup('tester');
    expect(await getPlanAccess()).toMatchObject({ role: 'tester', full: true });
    setup('admin');
    expect(await getPlanAccess()).toMatchObject({ role: 'admin', full: true, viewAs: null });
  });

  it("un admin peut simuler l'offre gratuite ou une offre payante", async () => {
    setup('admin');
    cookieValue.v = 'free';
    expect(await getPlanAccess()).toMatchObject({ full: false, viewAs: 'free' });
    cookieValue.v = 'voyage';
    expect(await getPlanAccess()).toMatchObject({ full: true, viewAs: 'voyage' });
  });

  it("la simulation est ignorée pour un testeur ou un client, et une valeur inconnue l'est aussi", async () => {
    setup('tester');
    cookieValue.v = 'free';
    expect(await getPlanAccess()).toMatchObject({ full: true, viewAs: null });
    setup(null, 0);
    cookieValue.v = 'pro';
    expect(await getPlanAccess()).toMatchObject({ full: false, viewAs: null });
    setup('admin');
    cookieValue.v = 'illimite';
    expect(await getPlanAccess()).toMatchObject({ full: true, viewAs: null });
  });

  it('visiteur non connecté : jours limités', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ supabase: {}, user: null } as never);
    expect(await getPlanAccess()).toEqual({ role: null, full: false, viewAs: null });
  });
});
