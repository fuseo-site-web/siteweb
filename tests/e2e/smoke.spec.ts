import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const locales = [
  { path: '/', lang: 'fr' },
  { path: '/en', lang: 'en' },
  { path: '/es', lang: 'es' },
];

for (const { path, lang } of locales) {
  test.describe(`page d'accueil ${lang}`, () => {
    test('affiche le titre dans la bonne langue', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('ne contacte aucun domaine tiers', async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      const external: string[] = [];
      page.on('request', (req) => {
        const url = req.url();
        if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
          external.push(url);
        }
      });
      // `networkidle` n'est jamais atteint au tout premier chargement à froid (préchargements de liens répétés) :
      // on attend le chargement complet puis une courte pause, ce qui suffit à voir d'éventuelles requêtes tierces.
      await page.goto(path, { waitUntil: 'load' });
      await page.waitForTimeout(2000);
      expect(external).toEqual([]);
    });

    test('est accessible (axe, WCAG 2.x AA)', async ({ page }) => {
      // Sans mouvement : les éléments de révélation au scroll sont visibles (pas de contraste mesuré en pleine transition).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test('une URL inconnue renvoie 404', async ({ request }) => {
  const response = await request.get('/page-inexistante');
  expect(response.status()).toBe(404);
});

test('les en-têtes de sécurité sont présents', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

const pages = [
  { path: '/la-science-du-jet-lag', lang: 'fr' },
  { path: '/en/jet-lag-science', lang: 'en' },
  { path: '/es/ciencia-del-jet-lag', lang: 'es' },
  { path: '/methode-anti-jet-lag', lang: 'fr' },
  { path: '/fuseo-pro', lang: 'fr' },
  { path: '/plan-du-site', lang: 'fr' },
  { path: '/mentions-legales', lang: 'fr' },
  { path: '/en/terms-of-sale', lang: 'en' },
  { path: '/equipe-medicale', lang: 'fr' },
  { path: '/en/medical-team', lang: 'en' },
  { path: '/blog', lang: 'fr' },
  { path: '/blog/pourquoi-le-jet-lag-est-plus-difficile-vers-l-est', lang: 'fr' },
  { path: '/en/blog/why-jet-lag-is-harder-when-flying-east', lang: 'en' },
  { path: '/tarifs', lang: 'fr' },
  { path: '/cgu', lang: 'fr' },
  { path: '/cookies', lang: 'fr' },
  { path: '/accessibilite', lang: 'fr' },
];

for (const { path, lang } of pages) {
  test(`page ${path} : h1, langue, canonical et accessibilité`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect(await page.locator('link[rel="alternate"][hreflang]').count()).toBeGreaterThanOrEqual(3);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('pages légales en attente de validation : noindex', async ({ page }) => {
  await page.goto('/mentions-legales');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('le pied de page crédite WebFitYou avec un lien et pointe vers les pages légales', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.locator('footer');
  const link = footer.getByRole('link', { name: 'WebFitYou' });
  await expect(link).toHaveAttribute('href', 'https://webfityou.com');
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  for (const name of ['Plan du site', 'Mentions légales', 'CGV', 'Confidentialité']) {
    await expect(footer.getByRole('link', { name })).toBeVisible();
  }
});

test('sitemap.xml et robots.txt', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/la-science-du-jet-lag');
  expect(sitemap).toContain('hreflang');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap:');
});

test.describe('planificateur', () => {
  test('génère un plan, ne renvoie que les jours gratuits et verrouille le reste', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const responses: Array<{ days: unknown[]; totalDays: number; lockedDays: number }> = [];
    page.on('response', async (r) => {
      if (r.url().includes('/api/plan') && r.request().method() === 'POST')
        responses.push(await r.json());
    });
    await page.goto('/plan-anti-jet-lag');
    await page.getByRole('button', { name: 'Générer mon plan' }).click();
    await expect(page.getByText(/Encore \d+ jours dans votre plan/)).toBeVisible();
    expect(responses).toHaveLength(1);
    const plan = responses[0]!;
    expect(plan.days).toHaveLength(3);
    expect(plan.lockedDays).toBe(plan.totalDays - 3);
    expect(plan.totalDays).toBeGreaterThan(10);
  });

  test("l'API refuse une entrée invalide et une origine étrangère", async ({ request }) => {
    expect((await request.post('/api/plan', { data: { x: 1 } })).status()).toBe(422);
    const res = await request.post('/api/plan', {
      data: {},
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status()).toBe(403);
  });

  test('le PDF du plan est un vrai PDF, refusé depuis une origine étrangère', async ({
    request,
  }) => {
    const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const body = {
      profile: {
        bed: '23:00',
        wake: '07:00',
        chronotype: 'intermediate',
        age: 40,
        caffeineUse: 'moderate',
        napHabit: 'sometimes',
        sleepQuality: 'good',
      },
      outbound: [
        { from: 'CDG', to: 'HND', departure: `${day(30)}T19:30`, arrival: `${day(31)}T15:25` },
      ],
      return: [],
      preDays: 2,
      strategy: 'AUTO',
      lamp: false,
      coffee: true,
    };
    const ok = await request.post('/api/plan/pdf?locale=fr', {
      data: body,
      headers: { origin: 'http://localhost:3100' },
    });
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toBe('application/pdf');
    expect(ok.headers()['content-disposition']).toContain('fuseo-CDG-HND.pdf');
    expect((await ok.body()).subarray(0, 5).toString()).toBe('%PDF-');
    const foreign = await request.post('/api/plan/pdf', {
      data: body,
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.status()).toBe(403);
  });

  test('est accessible (axe)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/plan-anti-jet-lag');
    await expect(page.getByRole('button', { name: 'Générer mon plan' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('compte', () => {
  test('la page de connexion propose Google et le lien magique, accessible et noindex', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/connexion');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('onglets connexion / création de compte et mot de passe oublié', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/connexion');
    const login = page.getByRole('tab', { name: 'Se connecter' });
    const signup = page.getByRole('tab', { name: 'Créer un compte' });
    await expect(login).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Mot de passe')).toBeVisible();

    await signup.click();
    await expect(signup).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toHaveAttribute('autocomplete', 'new-password');

    await login.click();
    await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click();
    await expect(
      page.getByRole('button', { name: 'Envoyer le lien de réinitialisation' }),
    ).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('la page de nouveau mot de passe sans session propose un nouveau lien', async ({ page }) => {
    await page.goto('/nouveau-mot-de-passe');
    await expect(page.getByText('Ce lien a expiré')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('le tableau de bord redirige les visiteurs vers la connexion', async ({ page }) => {
    await page.goto('/mon-compte');
    await expect(page).toHaveURL(/\/connexion\?next=/);
  });

  test('les API de compte exigent une session', async ({ request }) => {
    for (const path of [
      '/api/profile',
      '/api/account/export',
      '/api/trips/00000000-0000-4000-8000-000000000000/pdf',
    ]) {
      expect((await request.get(path)).status()).toBe(401);
    }
    const save = await request.post('/api/trips', {
      data: {},
      headers: { origin: 'http://localhost:3100' },
    });
    expect([401, 403]).toContain(save.status());
  });
});

test('un lien d’e-mail invalide renvoie vers la connexion sans redirection ouverte', async ({
  request,
}) => {
  const r = await request.get('/auth/confirm?token_hash=invalide&type=email&next=//evil.example', {
    maxRedirects: 0,
  });
  expect(r.status()).toBe(307);
  expect(r.headers()['location']).toMatch(/\/connexion\?error=1$/);
});

test.describe('blog', () => {
  test('recherche, thèmes et lien direct filtrent les articles', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/blog');
    const cards = page.locator('main li:has(h2)');
    await expect(cards).toHaveCount(6);

    await page.getByRole('searchbox', { name: 'Rechercher un article' }).fill('melatonine');
    await expect(cards).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: 'article' })).toContainText(
      '1 article',
    );
    await expect(page).toHaveURL(/\?q=melatonine/);

    await page.getByRole('button', { name: 'Effacer la recherche' }).click();
    await expect(cards).toHaveCount(6);

    await page.getByRole('button', { name: 'En vol', exact: true }).click();
    await expect(cards).toHaveCount(1);
    await page.getByRole('searchbox').fill('zzzz');
    await expect(page.getByText(/Aucun article ne correspond/)).toBeVisible();

    await page.goto('/blog?q=cafeine');
    await expect(cards).toHaveCount(1);
  });

  test('6 articles : pas de pagination ; chaque carte a son illustration', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('navigation', { name: 'Pagination des articles' })).toHaveCount(0);
    const imgs = page.locator('main li img');
    await expect(imgs).toHaveCount(6);
  });

  test('un article a illustration, fil d’Ariane, sommaire et articles liés', async ({ page }) => {
    await page.goto('/blog/la-lumiere-premier-levier-contre-le-decalage-horaire');
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" })).toContainText('Blog');
    await expect(page.locator('main img').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'À lire aussi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pour aller plus loin' })).toBeVisible();
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/\/images\/blog\/lumiere-horloge-biologique\.jpg$/);
  });
});

test('les pages de contenu proposent des liens vers des pages liées', async ({ page }) => {
  for (const path of [
    '/la-science-du-jet-lag',
    '/methode-anti-jet-lag',
    '/equipe-medicale',
    '/tarifs',
  ]) {
    await page.goto(path);
    const links = page.locator('section[aria-labelledby="related-title"] a');
    expect(await links.count(), path).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" })).toBeVisible();
  }
});

test.describe('consentement aux traceurs', () => {
  const tracker = /googletagmanager|google-analytics|clarity\.ms/;

  // La preuve de consentement n'écrit pas en base pendant les tests.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/consent', (r) => r.fulfill({ status: 204 }));
  });

  test('le pop-up est proposé, refuser le ferme sans aucune requête vers Google ou Microsoft', async ({
    page,
  }) => {
    const hits: string[] = [];
    page.on('request', (r) => tracker.test(r.url()) && hits.push(r.url()));
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Tout refuser' }).click();
    await expect(dialog).toBeHidden();
    await page.goto('/blog', { waitUntil: 'networkidle' });
    expect(hits).toEqual([]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('le choix est consigné (identifiant aléatoire, choix, version, sans donnée personnelle)', async ({
    page,
  }) => {
    await page.goto('/');
    const posted = page.waitForRequest((r) => r.url().endsWith('/api/consent'));
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const payload = (await posted).postDataJSON();
    expect(Object.keys(payload).sort()).toEqual(['analytics', 'id', 'source', 'version']);
    expect(payload).toMatchObject({ analytics: false, source: 'banner' });
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('le choix se rouvre depuis le pied de page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout accepter' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Gérer mes cookies' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
