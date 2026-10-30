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

test.describe('espace administrateur et statistiques', () => {
  test("l'espace admin est fermé aux visiteurs : redirection vers la connexion", async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/connexion\?next=(%2F|\/)admin$/);
    await page.goto('/admin/blog');
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("les routes d'envoi d'image et d'événements refusent les accès non autorisés", async ({
    request,
  }) => {
    const up = await request.post('/api/admin/upload', {
      multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') } },
    });
    expect(up.status()).toBe(403);
    const ids = {
      vid: '7b1f3c52-5d0e-4a8e-9a3b-2c6d1e4f8a90',
      sid: '0e2c9d44-8a52-4f0c-b0b4-7d1a6f3c9e11',
    };
    // Sans cookie de consentement : accepté en silence mais rien n'est enregistré.
    const ev = await request.post('/api/events', {
      data: { ...ids, events: [{ name: 'page_view', path: '/' }] },
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });
    expect(ev.status()).toBe(204);
    const bad = await request.post('/api/events', { data: { nope: true } });
    expect([204, 422]).toContain(bad.status());
    const foreign = await request.post('/api/events', {
      data: { ...ids, events: [{ name: 'page_view', path: '/' }] },
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.status()).toBe(403);
  });

  test('le formulaire de contact refuse un envoi incomplet et un site tiers', async ({
    request,
  }) => {
    const incomplete = await request.post('/api/contact', { data: { kind: 'contact', name: 'A' } });
    // 429 si la limite horaire (5 envois par appareil) est déjà atteinte par des essais précédents : la requête n'est de toute façon pas acceptée.
    expect([422, 429]).toContain(incomplete.status());
    const foreign = await request.post('/api/contact', {
      data: {},
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.status()).toBe(403);
  });

  test('la page contact est accessible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('référencement', () => {
  test('une adresse inconnue renvoie une vraie 404, y compris pour un article dans la mauvaise langue', async ({
    request,
  }) => {
    for (const path of [
      '/blog/article-qui-nexiste-pas',
      '/en/blog/melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes',
      '/es/blog/melatonin-and-jet-lag-what-the-studies-really-say',
    ]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("le sélecteur de langue d'un article renvoie vers sa traduction, sans préfixe /fr", async ({
    page,
  }) => {
    await page.goto('/blog/melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes');
    const hrefs = await page
      .locator('a[lang]')
      .evaluateAll((els) => els.map((e) => [e.getAttribute('lang'), e.getAttribute('href')]));
    expect(Object.fromEntries(hrefs)).toMatchObject({
      fr: '/blog/melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes',
      en: '/en/blog/melatonin-and-jet-lag-what-the-studies-really-say',
      es: '/es/blog/melatonina-y-jet-lag-lo-que-dicen-realmente-los-estudios',
    });
    await page.goto('/en/pricing');
    expect(await page.locator('a[lang="fr"]').getAttribute('href')).toBe('/tarifs');
  });

  test('chaque page a un titre de 20 à 60 caractères, une description et une image de partage', async ({
    page,
  }) => {
    for (const path of [
      '/',
      '/blog',
      '/connexion',
      '/contact',
      '/plan-du-site',
      '/la-science-du-jet-lag',
      '/en/site-map',
      '/es/mapa-del-sitio',
    ]) {
      await page.goto(path);
      const title = await page.title();
      expect(title.length, `${path}: ${title}`).toBeGreaterThanOrEqual(20);
      expect(title.length, `${path}: ${title}`).toBeLessThanOrEqual(60);
      const desc = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect(desc.length, path).toBeGreaterThanOrEqual(70);
      expect(desc.length, path).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[property="og:image"]'), path).toHaveCount(1);
      await expect(page.locator('meta[name="twitter:card"]'), path).toHaveAttribute(
        'content',
        'summary_large_image',
      );
    }
  });
});

test.describe('numéro de vol', () => {
  test('saisir le numéro remplit tout seul aéroports, dates et heures', async ({ page }) => {
    await page.route('**/api/flight*', (r) => {
      const url = new URL(r.request().url());
      expect(url.searchParams.get('number')).toBe('AF1380');
      return r.fulfill({
        json: {
          from: 'CDG',
          to: 'LHR',
          depDate: '2026-11-04',
          depTime: '07:05',
          arrDate: '2026-11-04',
          arrTime: '07:30',
          approx: false,
        },
      });
    });
    await page.goto('/plan-anti-jet-lag');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    await page.locator('#outbound0fn').fill('AF1380');
    await expect(page.getByText('Vol trouvé : les informations sont remplies')).toBeVisible();
    await expect(page.locator('#outbound0dd')).toHaveValue('2026-11-04');
    await expect(page.locator('#outbound0dt')).toHaveValue('07:05');
    await expect(page.locator('#outbound0at')).toHaveValue('07:30');
  });

  test('signale des horaires estimés et un service indisponible, sans rien inventer', async ({
    page,
  }) => {
    let mode: 'approx' | 'quota' = 'approx';
    await page.route('**/api/flight*', (r) =>
      mode === 'approx'
        ? r.fulfill({
            json: {
              from: 'CDG',
              to: 'HND',
              depDate: '2026-12-15',
              depTime: '23:30',
              arrDate: '2026-12-16',
              arrTime: '19:05',
              approx: true,
            },
          })
        : r.fulfill({ status: 503, json: { error: 'quota' } }),
    );
    await page.goto('/plan-anti-jet-lag');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    await page.locator('#outbound0fn').fill('AF276');
    await expect(page.getByText('Horaires habituels de ce vol')).toBeVisible();
    mode = 'quota';
    await page.locator('#outbound0fn').fill('AF277');
    await expect(
      page.getByText('La recherche de vol est momentanément indisponible'),
    ).toBeVisible();
  });

  test('un numéro de forme invalide ne lance aucune recherche', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/flight*', (r) => {
      calls++;
      return r.fulfill({ status: 404, json: { error: 'not_found' } });
    });
    await page.goto('/plan-anti-jet-lag');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    await page.locator('#outbound0fn').fill('12');
    await page.waitForTimeout(1200);
    expect(calls).toBe(0);
  });
});

test.describe('identité du site et partage de liens', () => {
  test("l'icône, le manifeste et l'image de partage sont servis et déclarés", async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/apple-touch-icon.png',
    );
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'fr_FR');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    for (const [path, type] of [
      ['/favicon.ico', /icon/],
      ['/apple-touch-icon.png', /png/],
      ['/images/og-fuseo.jpg', /jpeg/],
      ['/site.webmanifest', /json/],
    ] as const) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
      expect(r.headers()['content-type'], path).toMatch(type);
    }
  });

  test('llms.txt présente le site aux assistants IA, et chaque article n’émet qu’un fil d’Ariane', async ({
    page,
    request,
  }) => {
    const r = await request.get('/llms.txt');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('text/plain');
    const body = await r.text();
    expect(body).toContain('# Fuseo');
    expect(body).toContain('/blog/melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes');
    await page.goto('/blog/melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes');
    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
      els.flatMap((e) => {
        const d = JSON.parse(e.textContent ?? '{}');
        return (d['@graph'] ?? [d]).map((x: { '@type': string }) => x['@type']);
      }),
    );
    expect(types.filter((t) => t === 'BreadcrumbList')).toHaveLength(1);
    expect(types).toContain('BlogPosting');
  });
});

test.describe('module « Préparez votre vol sereinement »', () => {
  const flight = {
    from: 'CDG',
    to: 'HND',
    fromCity: 'Paris',
    toCity: 'Tokyo',
    depDate: '2026-11-04',
    depTime: '19:30',
    arrDate: '2026-11-05',
    arrTime: '15:25',
    durationMin: 775,
    shiftHours: 8,
    approx: false,
  };

  test('propose trois types de voyage et deux onglets, avec un champ de plus pour un aller-retour', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const finder = page.getByRole('region', { name: 'Préparez votre vol sereinement' });
    await expect(finder.getByRole('radio', { name: 'Aller-retour' })).toBeChecked();
    await expect(finder.getByLabel('Vol aller')).toBeVisible();
    await expect(finder.getByLabel('Vol retour (facultatif)')).toBeVisible();
    await finder.getByRole('radio', { name: 'Aller simple' }).click();
    await expect(finder.getByLabel('Vol retour (facultatif)')).toHaveCount(0);
    await finder.getByRole('radio', { name: 'Multi-destinations' }).click();
    await finder.getByRole('button', { name: 'Ajouter un vol' }).click();
    await expect(finder.getByLabel(/^Vol 3$/)).toBeVisible();
    await finder.getByRole('tab', { name: 'Itinéraire' }).click();
    await expect(finder.getByLabel(/Trajet 1 · Départ/)).toBeVisible();
  });

  test('anime la recherche puis affiche le vol ; le plan reste flouté et vide de données réelles hors connexion', async ({
    page,
  }) => {
    const planCalls: string[] = [];
    await page.route('**/api/plan**', (r) => {
      planCalls.push(r.request().url());
      return r.abort();
    });
    await page.route('**/api/flight*', (r) => r.fulfill({ json: flight }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const finder = page.getByRole('region', { name: 'Préparez votre vol sereinement' });
    await finder.getByLabel('Vol aller').fill('AF1380');
    await finder.getByRole('button', { name: 'Créer mon plan' }).click();
    await expect(finder.getByText('Création de votre plan…')).toBeVisible();
    const started = Date.now();
    await expect(
      finder.getByText('Vol trouvé : votre plan se prépare', { exact: true }),
    ).toBeVisible({ timeout: 9000 });
    expect(Date.now() - started).toBeGreaterThan(2500); // l'animation dure 3 à 4 secondes
    await expect(finder.getByText('Paris')).toBeVisible();
    await expect(finder.getByText('12 h 55')).toBeVisible();
    await expect(finder.getByText('8 h vers l’est')).toBeVisible();
    await expect(finder.getByText('Votre plan sommeil sur mesure')).toBeVisible();
    await expect(finder.locator('[aria-hidden="true"][inert]')).toHaveCount(1);
    const signIn = finder.getByRole('link', { name: 'Me connecter' });
    const href = (await signIn.getAttribute('href')) ?? '';
    expect(href).toContain('next=%2Fplan-anti-jet-lag%3Fout%3DAF1380%2540'); // adresse de retour encodée en entier
    expect(
      await finder.getByRole('link', { name: 'Créer mon compte' }).getAttribute('href'),
    ).toContain('mode=signup');
    expect(planCalls).toEqual([]); // aucun plan n'est demandé tant que le visiteur n'est pas connecté
  });

  test('un vol introuvable propose de saisir son itinéraire', async ({ page }) => {
    await page.route('**/api/flight*', (r) =>
      r.fulfill({ status: 404, json: { error: 'not_found' } }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const finder = page.getByRole('region', { name: 'Préparez votre vol sereinement' });
    await finder.getByLabel('Vol aller').fill('AF9999');
    await finder.getByRole('button', { name: 'Créer mon plan' }).click();
    await expect(finder.getByText(/Ce vol est introuvable/)).toBeVisible({ timeout: 9000 });
    await finder.getByRole('button', { name: 'Saisir mon itinéraire' }).click();
    await expect(finder.getByRole('tab', { name: 'Itinéraire' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('le planificateur reprend le vol saisi sur la page d’accueil', async ({ page }) => {
    await page.route('**/api/flight*', (r) => r.fulfill({ json: flight }));
    await page.goto('/plan-anti-jet-lag?out=AF1380@2026-11-04&back=AF1381@2026-11-14');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    await expect(page.locator('#outbound0fn')).toHaveValue('AF1380');
    await expect(page.locator('#outbound0dd')).toHaveValue('2026-11-04');
    await expect(page.locator('#outbound0dt')).toHaveValue('19:30');
    await expect(page.locator('#ret0fn')).toHaveValue('AF1381');
  });

  test("la frise « Jour du vol » place le trait bleu au-dessus de la barre, avec l'avion à l'atterrissage", async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    const seg = page.locator('[data-seg="flight"][data-cont="true"]').first();
    await expect(seg).toBeVisible();
    const bar = seg.locator('xpath=..');
    const [a, b] = await Promise.all([seg.boundingBox(), bar.boundingBox()]);
    expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 1); // le trait est posé au-dessus de la frise
    expect(a!.x).toBeGreaterThanOrEqual(b!.x - 1);
    expect(a!.x + a!.width).toBeLessThan(b!.x + b!.width); // il s'arrête à l'arrivée, avant la fin de la journée
  });
});

test.describe('ressources pour les robots et les agents IA', () => {
  test('robots.txt autorise explicitement les robots IA tout en protégeant les pages privées', async ({
    request,
  }) => {
    const txt = await (await request.get('/robots.txt')).text();
    const groups = txt.split(/\n\s*\n/);
    const ai = groups.find((g) => /User-Agent: GPTBot/i.test(g))!;
    expect(ai).toBeTruthy();
    for (const bot of [
      'ClaudeBot',
      'PerplexityBot',
      'OAI-SearchBot',
      'Google-Extended',
      'ChatGPT-User',
    ]) {
      expect(ai).toContain(`User-Agent: ${bot}`);
    }
    expect(ai).toContain('Allow: /');
    for (const privatePath of ['/admin/', '/api/', '/connexion'])
      expect(ai).toContain(`Disallow: ${privatePath}`);
    expect(txt).toContain('Sitemap:');
  });

  test('llms-full.txt contient le texte complet, dans les trois langues', async ({ request }) => {
    const fr = await request.get('/llms-full.txt');
    expect(fr.headers()['content-type']).toContain('text/plain');
    const frText = await fr.text();
    expect(frText).toContain('# Fuseo : texte complet (fr)');
    expect(frText).toContain('## Mélatonine et jet lag');
    expect(frText).toContain('Références :');
    expect(frText).not.toMatch(/<(b|i|a|span|p)[ >]/);
    expect(frText.length).toBeGreaterThan(20_000);
    expect(await (await request.get('/llms-full.txt?lang=en')).text()).toContain(
      'texte complet (en)',
    );
    expect(await (await request.get('/llms-full.txt?lang=es')).text()).toContain(
      'texte complet (es)',
    );
  });

  test('ai.txt, humans.txt et security.txt sont servis (security.txt valide, non expiré)', async ({
    request,
  }) => {
    for (const path of ['/ai.txt', '/humans.txt', '/.well-known/security.txt']) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
      expect(r.headers()['content-type'], path).toContain('text/plain');
    }
    const sec = await (await request.get('/.well-known/security.txt')).text();
    expect(sec).toMatch(/^Contact: mailto:/m);
    const expires = /^Expires: (.+)$/m.exec(sec)![1]!;
    expect(Date.parse(expires)).toBeGreaterThan(Date.now());
    expect(await (await request.get('/ai.txt')).text()).toContain('MCP: https://fuseo.net/mcp');
  });
});

test.describe('serveur MCP public', () => {
  const rpc = (request: import('@playwright/test').APIRequestContext, body: unknown) =>
    request.post('/mcp', {
      data: body,
      headers: { accept: 'application/json, text/event-stream' },
    });
  const call = async (
    request: import('@playwright/test').APIRequestContext,
    name: string,
    args: object,
  ) =>
    (await (
      await rpc(request, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args },
      })
    ).json()) as {
      result?: { isError?: boolean; content: Array<{ text: string }> };
      error?: { code: number };
    };

  test('initialise, liste cinq outils en lecture seule avec leur schéma', async ({ request }) => {
    const init = await (
      await rpc(request, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1' },
        },
      })
    ).json();
    expect(init.result.protocolVersion).toBe('2025-06-18');
    expect(init.result.serverInfo.name).toBe('fuseo');
    const list = await (await rpc(request, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    const names = list.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual([
      'site_info',
      'search_articles',
      'get_article',
      'search_airports',
      'time_zone_shift',
    ]);
    for (const t of list.result.tools) {
      expect(t.inputSchema.type).toBe('object');
      expect(t.annotations.readOnlyHint).toBe(true);
    }
  });

  test('les outils répondent avec du contenu réel du site', async ({ request }) => {
    expect((await call(request, 'site_info', {})).result!.content[0]!.text).toContain(
      'plan anti-jet lag',
    );
    const found = (await call(request, 'search_articles', { query: 'melatonine' })).result!
      .content[0]!.text;
    expect(found).toContain('melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes');
    const article = (
      await call(request, 'get_article', {
        slug: 'melatonine-et-jet-lag-ce-que-disent-vraiment-les-etudes',
      })
    ).result!.content[0]!.text;
    expect(article).toContain('# Mélatonine et jet lag');
    expect(article).toContain('Références :');
    expect(
      (await call(request, 'search_airports', { query: 'Tokyo' })).result!.content[0]!.text,
    ).toContain('HND');
    const shift = (
      await call(request, 'time_zone_shift', { from: 'cdg', to: 'HND', date: '2026-10-12' })
    ).result!.content[0]!.text;
    expect(shift).toContain('7 h vers l’est');
    expect(shift).toContain('out=CDG-HND-2026-10-12');
  });

  test('refuse proprement les requêtes invalides, inconnues ou trop longues', async ({
    request,
  }) => {
    const bad = await call(request, 'time_zone_shift', { from: 'PARIS', to: 'HND' });
    expect(bad.result!.isError).toBe(true);
    expect((await call(request, 'delete_everything', {})).error!.code).toBe(-32602);
    const unknown = await (
      await rpc(request, { jsonrpc: '2.0', id: 3, method: 'resources/subscribe' })
    ).json();
    expect(unknown.error.code).toBe(-32601);
    expect(
      (await rpc(request, { jsonrpc: '2.0', method: 'notifications/initialized' })).status(),
    ).toBe(202);
    expect(
      (
        await request.post('/mcp', {
          data: 'pas du json',
          headers: { 'content-type': 'text/plain' },
        })
      ).status(),
    ).toBe(400);
    expect((await request.get('/mcp')).status()).toBe(405);
    expect(
      (
        await request.post('/mcp', {
          data: 'x'.repeat(20_000),
          headers: { 'content-type': 'text/plain' },
        })
      ).status(),
    ).toBe(413);
  });
});
