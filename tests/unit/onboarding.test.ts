import { describe, expect, it } from 'vitest';
import { isProfileComplete, pathAfterSignIn, safeNext } from '@/lib/onboarding';

const full = {
  first_name: 'Alex',
  last_name: 'Martin',
  birth_date: '1990-04-12',
  country: 'FR',
  home_airport: 'CDG',
};

describe('première connexion', () => {
  it('exige les cinq informations', () => {
    expect(isProfileComplete(full)).toBe(true);
    expect(isProfileComplete(null)).toBe(false);
    for (const k of Object.keys(full) as Array<keyof typeof full>) {
      expect(isProfileComplete({ ...full, [k]: null })).toBe(false);
      expect(isProfileComplete({ ...full, [k]: '' })).toBe(false);
    }
  });

  it("envoie vers l'espace compte (avec la page d'origine) tant que le profil est incomplet", () => {
    expect(pathAfterSignIn(null, '/plan-anti-jet-lag')).toBe(
      '/mon-compte?next=%2Fplan-anti-jet-lag',
    );
    expect(pathAfterSignIn(null, '/en/jet-lag-plan')).toBe('/en/account?next=%2Fen%2Fjet-lag-plan');
    expect(pathAfterSignIn(null, '/es/blog')).toBe('/es/mi-cuenta?next=%2Fes%2Fblog');
  });

  it("ne boucle pas quand la destination est déjà l'espace compte, et ne détourne pas un profil complet", () => {
    expect(pathAfterSignIn(null, '/mon-compte')).toBe('/mon-compte');
    expect(pathAfterSignIn(full, '/plan-anti-jet-lag')).toBe('/plan-anti-jet-lag');
  });

  it('refuse les redirections vers un autre site', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/blog')).toBe('/blog');
    expect(safeNext(null, '')).toBe('');
  });
});
