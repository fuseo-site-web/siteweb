# Fuseo — Plan de refonte Next.js / Supabase / Netlify

> Document de cadrage et d'architecture. Source analysée : `31- Fuseo/index.html` (prototype mono-fichier, 714 Ko).
> Cible : site production, sécurisé, SEO + GEO, conforme RGPD/CNIL, avec back-office admin.

---

## 0. Résumé exécutif

**Fuseo** est un service B2C freemium de **plan anti-jet lag personnalisé**. L'utilisateur saisit ses horaires de sommeil et ses vols ; un moteur de chronobiologie (oscillateur circadien de Kronauer/Forger, modèle à deux processus de Borbély, courbes de réponse à la lumière et à la mélatonine) simule son horloge biologique heure par heure et produit un plan jour par jour : quand dormir, chercher ou éviter la lumière, faire la sieste, arrêter la caféine, et (option, avec questionnaire de sécurité) la mélatonine. Les premiers jours sont gratuits ; le plan complet coûte 8,90 € par voyage ou 79,90 € pour 12 mois. Le service est adossé à l'Institut Médical du Sommeil (Dr Taieb, Dr Elbaz) et cite 29 références scientifiques.

**Le prototype est un très bon *produit* mais une mauvaise *base technique*.** Le contenu, le moteur et le sens du design sont à garder. Tout le reste (routage, paiement, i18n, tracking, sécurité) est à reconstruire.

**Les 3 défauts qui justifient la refonte :**

| # | Défaut | Conséquence |
|---|---|---|
| 1 | **Paywall 100 % côté navigateur.** `?paiement=voyage&session_id=cs_x` suffit à débloquer le plan : le code vérifie seulement `/^cs_/.test(sid)`. Il existe aussi `?demo=ims` et des codes « amis » dont les hashs sont publics. | Perte de revenu directe, aucune réconciliation Stripe. |
| 2 | **Une seule URL indexable.** Pages = `<section hidden>` + routage par `#hash`. Aucun slug, sitemap, canonical, hreflang. Le blog n'existe pas pour Google. | SEO quasi nul malgré un excellent contenu. |
| 3 | **Tracking inopérant et non conforme.** Le code fait `dataLayer.push(...)` mais aucun GTM/GA n'est chargé : les événements sont perdus. La page « Confidentialité » affirme qu'aucun consentement n'est nécessaire, ce qui deviendra faux dès qu'on ajoute GA4 et Clarity. | Aucune donnée, risque CNIL. |

**Décisions validées (révision 2) :**
- **Paiement : Stripe** (Checkout Sessions + webhooks, voir §6).
- **Données de santé : tout est stocké dans Supabase** (profil de sommeil, vols, questionnaire de sécurité, plans), donc compte utilisateur, consentement explicite, chiffrement et AIPD obligatoires (voir D1/D5, §4, §10.4).
- **Statistiques internes : derrière le consentement**, via un pop-up en bas à gauche du site et la page Cookies (voir D4, §10.1). Plus d'hypothèse d'exemption CNIL.

**Décision d'architecture centrale :** le moteur passe **côté serveur** et les plans sont enregistrés dans Supabase, ce qui permet un vrai paywall, protège la propriété intellectuelle du moteur, ouvre le multi-appareil et l'historique des voyages. Voir D1.

**Durée estimée :** 7 à 9 semaines pour une personne (hors rédaction juridique), détaillées en §14.

---

## 1. Analyse de l'existant

### 1.1 Concept et périmètre fonctionnel

| Domaine | Contenu actuel |
|---|---|
| **Pages (15 + 6 articles)** | Accueil, La science, Notre méthode, Qui sommes-nous, Tarifs, Fuseo Pro (B2B), Équipement, Blog (6 articles), Sources, Transparence, Mentions, CGV, Confidentialité, Contact, Planificateur |
| **Planificateur** | 3 étapes : (1) nuits habituelles + profil (chronotype, âge, caféine, sieste, qualité de sommeil) ; (2) vols aller/escales/retour, ~120 aéroports codés en dur avec fuseau IANA ; (3) objectif (s'adapter / être performant à un événement), préparation avant départ (0-3 j), stratégie (auto / complète / partielle / garder l'heure de départ), lampe de luminothérapie, café, mélatonine + questionnaire de contre-indications |
| **Moteur** (`Fuseo circadian engine v2.0.0`, 109 Ko) | `generateCircadianPlan`, `recalculatePlan`, optimiseur multi-stratégies, oscillateur circadien, pression de sommeil, PRC lumière et mélatonine, élévation solaire, faisabilité pratique (vol, escale, événement), filtres de sécurité caféine/mélatonine, score d'adaptation |
| **Sortie** | Plan jour par jour (frises horaires), tableau de bord d'horloge, conseils, « quelque chose a changé ? » (observations → recalcul), vue avancée, export **PDF** (jsPDF) et **.ics** |
| **Monétisation** | Gratuit (aperçu) · 8,90 € / voyage · 79,90 € / 12 mois · liens Stripe Payment Links · codes d'accès · Fuseo Pro sur devis |
| **Langues** | FR (source), EN, ES via dictionnaire JS de 1 157 phrases traduites à l'exécution |
| **Légal** | SLEEPTECHNOLOGY SAS, RCS Nanterre 933 908 196 ; hébergeur Netlify ; CGV avec renonciation à la rétractation (L221-28 13°) ; mention santé |
| **Événements prévus** | `hero_cta_click`, `plan_started`, `flight_added`, `plan_generated`, `preview_viewed`, `checkout_started`, `purchase_completed`, `code_redeemed`, `pdf_downloaded`, `ics_downloaded`, `plan_observation`, `pro_contact` |

### 1.2 Inventaire technique du fichier

| Bloc | Taille | Remarque |
|---|---|---|
| HTML + contenu | ~230 Ko | Toutes les pages dans le DOM, masquées par l'attribut `hidden` |
| Moteur (JS inline) | 109 Ko | Pur calcul, bien isolé : **l'actif le plus précieux** |
| UI planificateur (JS inline) | 87 Ko | Rendu par chaînes HTML, `localStorage` (`fuseo-paid`, `fuseo-demo`, `fuseo-mode`) |
| Dictionnaire i18n | 216 Ko | Clés = phrases françaises, traduction par remplacement dans le DOM |
| CSS | 52 Ko | Variables bien structurées (réutilisables en design tokens) |
| Images base64 | 126 Ko | 8 images (photos, logos), dont un logo répété |
| Dépendances externes | — | Google Fonts (Montserrat), jsPDF 2.5.1 via cdnjs (sans SRI), Stripe Payment Links, Netlify Forms |

### 1.3 À conserver (forces)

- **Qualité éditoriale et scientifique** : articles sourcés, 29 références, bandeaux « à retenir », transparence commerciale. Atout E-E-A-T majeur sur un sujet santé (YMYL).
- **Moteur de calcul pur** et testable, déjà modulaire en interne.
- **Garde-fous médicaux** : questionnaire de sécurité mélatonine, mentions, public adulte.
- **Sens de la vie privée** : le prototype garde les données dans le navigateur. Le choix validé (tout dans Supabase) abandonne cette protection : elle est compensée par le chiffrement, le consentement explicite, le cloisonnement et l'AIPD (§10.4).
- **Direction artistique** : palette, typographie, animations avec `prefers-reduced-motion`.
- **Nommage des événements** de tracking : on le reprend tel quel.

### 1.4 Dette et risques identifiés

| Gravité | Constat | Traitement dans la refonte |
|---|---|---|
| 🔴 Critique | Paywall forgeable (localStorage + regex `cs_`), backdoor `?demo=ims`, hashs SHA-256 non salés des codes dans le JS public | Entitlements en base, webhook Stripe signé, codes promo côté serveur (§6) |
| 🔴 Critique | Accès payé lié à un appareil/navigateur (CGV §4) : perte du plan en changeant de navigateur | Lien magique par e-mail + compte implicite (§6) |
| 🔴 Critique | Pas de consentement alors que GA4/Clarity sont prévus ; Google Fonts transmet l'IP à Google | Bannière CNIL, auto-hébergement des polices, chargement conditionnel (§10) |
| 🟠 Élevée | Un seul document, routage par hash : pas de SEO, pas de partage de page, pas d'analytics par page | Routes réelles, SSG/ISR (§3, §8) |
| 🟠 Élevée | i18n à l'exécution : Google n'indexe que le FR, pas de hreflang | `next-intl`, `/en`, `/es`, hreflang (§8) |
| 🟠 Élevée | Aucune en-tête de sécurité (CSP, HSTS…), script tiers sans SRI | `middleware` + `netlify.toml` (§11) |
| 🟠 Élevée | 714 Ko à charger avant tout affichage ; LCP/INP médiocres | Découpage par route, `next/image`, `next/font` (§13) |
| 🟡 Moyenne | Texte des recommandations généré en français dans le moteur → i18n fragile | Le moteur renvoie des **codes + valeurs** ; l'UI formate (§5) |
| 🟡 Moyenne | Contact via Netlify Forms uniquement : pas de suivi, anti-spam basique | Route API + Turnstile + Supabase + Resend (§7) |
| 🟡 Moyenne | CGV : médiateur de la consommation non renseigné (`[à compléter]`) | **Obligatoire en B2C**, à désigner avant mise en ligne |
| 🟢 Faible | JSON-LD minimal, pas d'OG image, pas de sitemap/robots | §8 |

---

## 2. Principes et décisions structurantes

### 2.1 Principes

1. **Privacy by design** : collecter le strict nécessaire, chiffrer ce qui touche à la santé, cloisonner (aucune jointure entre statistiques et données de santé), hébergement UE.
2. **Server-authoritative** : toute règle de gestion (accès payant, rôles admin, limites) est appliquée côté serveur **et** par RLS Postgres. Le client n'est jamais une source de vérité.
3. **Rendu statique d'abord** : tout ce qui peut être pré-rendu l'est (SEO, performance, coût).
4. **Un seul moteur, pur et testé** : aucune dépendance React/DOM, tests de non-régression « golden master » contre le prototype.
5. **Mesurer avec accord** : statistiques internes, GA4 et Clarity uniquement après consentement ; le back-office affiche le taux de consentement pour que les chiffres soient lus à leur juste valeur.

### 2.2 Décisions à valider (recommandation par défaut en gras)

| ID | Question | Options | Recommandation |
|---|---|---|---|
| **D1** ✅ | Où tourne le moteur ? | (a) navigateur · (b) serveur sans persistance · (c) **serveur + enregistrement dans Supabase** | **(c) validé.** Le moteur s'exécute dans une fonction Netlify ; profil, vols, questionnaire de sécurité et plans sont enregistrés dans Supabase, rattachés à un compte. Le plan complet n'est jamais envoyé sans droit d'accès. |
| **D2** | Qu'achète-t-on avec « Un voyage » ? | Illimité sur l'appareil (actuel) · **un voyage = un itinéraire (aller + retour), modifiable** | Un crédit est consommé à la première génération du plan complet ; modifier horaires/escales de **ce** voyage reste libre, changer de destination consomme un nouveau crédit. À formaliser dans les CGV. |
| **D3** | Compte obligatoire ? | Oui · invité | **Compte requis dès qu'on enregistre un plan** (D1) : création par lien magique e-mail, sans mot de passe. Le formulaire reste utilisable sans compte pour tester l'aperçu gratuit (calcul sans enregistrement) ; l'enregistrement et l'achat créent le compte. |
| **D4** ✅ | Mesure d'audience | exemption CNIL · **tout sous consentement** | **Validé : statistiques internes, GA4, GTM et Clarity derrière le consentement**, demandé par un pop-up en bas à gauche et gérable sur la page Cookies. Aucune hypothèse d'exemption. Les revenus du back-office viennent de Stripe, pas des statistiques. |
| **D5** ✅ | Données de santé (art. 9 RGPD) | minimiser · **tout stocker dans Supabase** | **Validé : tout est stocké dans Supabase.** Conditions : consentement explicite et séparé à la création du compte, chiffrement applicatif des champs de santé, cloisonnement des statistiques, **AIPD obligatoire avant ouverture** et vérification de l'obligation HDS (voir §10.4). |
| **D6** | Blog | **MDX versionné dans le repo** · CMS en admin | MDX : meilleur pour SEO/perf, relecture médicale via pull requests, historique des modifications. Un CMS peut venir plus tard. |
| **D7** | Langues | FR seul · **FR au lancement, EN/ES livrées juste après** | Architecture i18n dès le jour 1 (coût marginal faible) ; traductions relues avant publication. |
| **D8** | Pages SEO par trajet (`/jet-lag/paris-new-york`) | Non · **Oui, ~40-60 trajets** | Contenu **réellement calculé** (décalage, sens, stratégie) et rédigé, pas du texte généré en masse (risque « scaled content abuse » chez Google). |

---

## 3. Architecture technique

### 3.1 Stack

| Couche | Choix | Justification |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript strict**, dernière version stable au démarrage, Node 22 LTS | RSC, SSG/ISR, route handlers, metadata API |
| Hébergement | **Netlify** (runtime Next.js officiel), environnements *Production / Deploy Preview / Branch (staging)* | Imposé ; previews par PR |
| Base / Auth | **Supabase, région UE (Paris ou Francfort)**, Postgres + Auth + RLS + migrations CLI | RGPD, RLS natif |
| Paiement | **Stripe Checkout Sessions** créées côté serveur + webhooks | Remplace les Payment Links statiques |
| E-mail | **Resend** (région `eu-west-1`) + **React Email** | Transactionnel + newsletter |
| Anti-spam | **Cloudflare Turnstile** | Plus respectueux de la vie privée que reCAPTCHA |
| Rate limiting | **Fonction Postgres Supabase** (compteur atomique par clé hachée + fenêtre glissante, `rate_limits` nettoyée par `pg_cron`) ; règles Netlify en complément si le plan les propose | Reste dans le périmètre Netlify + Supabase, sans service tiers |
| Tâches planifiées | **Netlify Scheduled Functions** + **`pg_cron`** Supabase | Pas de serveur à maintenir |
| UI | CSS Modules ou Tailwind sur **design tokens** repris du prototype ; icônes SVG inline | Pas de lib UI lourde |
| i18n | `next-intl` | Routes localisées, hreflang |
| Contenu | MDX (`next-mdx-remote` ou `@next/mdx`) + front-matter validé par Zod | |
| Validation | **Zod** partout (API, formulaires, variables d'env via `@t3-oss/env-nextjs` ou équivalent) | |
| Graphiques admin | Recharts | |
| PDF | `pdf-lib` ou `@react-pdf/renderer` en route handler (à benchmarker) | PDF généré côté serveur, donc protégé par l'accès |
| Qualité | ESLint, Prettier, Vitest, Playwright, axe-core, Lighthouse CI, GitHub Actions | |
| Observabilité | Sentry (région UE, scrubbing activé), Better Stack ou UptimeRobot | |

### 3.2 Schéma d'ensemble

```
                    ┌────────────────────────── Navigateur ──────────────────────────┐
                    │  Pages statiques (SSG/ISR) · Planificateur (client) · Bannière  │
                    └───────┬───────────────────────────┬─────────────────────────────┘
                            │ HTML/JS (CDN Netlify)     │ fetch (JSON, zod)
                    ┌───────▼───────────────────────────▼─────────────────────────────┐
                    │                   Netlify — Next.js runtime                      │
                    │  middleware : CSP nonce · locale · garde /admin · bots           │
                    │  /api/plan ──► moteur (pur, stateless) ──► aperçu ou plan complet│
                    │  /api/checkout ─► Stripe        /api/stripe/webhook ◄─ Stripe    │
                    │  /api/events · /api/consent · /api/contact · /api/newsletter     │
                    │  /api/resend/webhook ◄─ Resend   scheduled functions (rollups,   │
                    │                                   Search Console, rappels)       │
                    └───────┬───────────────┬──────────────────┬───────────────────────┘
                            │ service role  │ API              │ API
                    ┌───────▼──────┐  ┌─────▼─────┐      ┌─────▼──────┐
                    │ Supabase (UE)│  │  Stripe   │      │  Resend    │
                    │ Postgres+RLS │  │ Checkout  │      │ (UE)       │
                    │ Auth (MFA)   │  │ Webhooks  │      └────────────┘
                    └──────────────┘  └───────────┘
   Hors consentement : aucun traceur, aucun événement. Après consentement « mesure d'audience » :
   événements internes (Supabase) + GTM → GA4 + Clarity (Clarity jamais sur /plan, /compte, /admin).
   Serveur = Netlify (fonctions, middleware, tâches planifiées) + Supabase (Postgres, Auth, pg_cron).
```

### 3.3 Arborescence du dépôt

```
siteweb/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (marketing)/            accueil, la-science, methode, equipe, tarifs, pro,
│  │  │  │                          equipement, blog, blog/[slug], jet-lag/[route],
│  │  │  │                          sources, transparence, contact
│  │  │  ├─ (legal)/                mentions-legales, cgv, confidentialite, cookies
│  │  │  ├─ (app)/plan/             planificateur, résultat, achat réussi
│  │  │  └─ (account)/compte/       mes voyages, mes accès, préférences e-mail
│  │  ├─ (admin)/admin/             back-office (hors i18n, noindex)
│  │  ├─ api/                       plan · checkout · stripe/webhook · resend/webhook ·
│  │  │                             events · consent · contact · newsletter · cron/*
│  │  ├─ sitemap.ts · robots.ts · manifest.ts · opengraph-image.tsx
│  ├─ engine/                       moteur pur TS (aucun import React/DOM) + tests golden
│  ├─ components/                   ui/ · marketing/ · planner/ · admin/ · consent/
│  ├─ lib/                          supabase/ · stripe/ · resend/ · analytics/ · consent/ · seo/ · security/
│  ├─ emails/                       templates React Email
│  └─ middleware.ts
├─ content/blog/{fr,en,es}/*.mdx
├─ messages/{fr,en,es}.json
├─ public/                          images optimisées, llms.txt, polices auto-hébergées
├─ supabase/{migrations,seed.sql,tests}
├─ tests/{e2e,golden}
├─ docs/                            ce plan, registre RGPD, runbook
├─ netlify.toml · .env.example · .github/workflows/ci.yml
```

### 3.4 Sitemap cible (FR ; `/en`, `/es` en miroir)

| URL | Rôle | Indexable |
|---|---|---|
| `/` | Accueil + démo | ✅ |
| `/la-science`, `/methode`, `/equipe`, `/sources`, `/transparence` | Confiance / E-E-A-T | ✅ |
| `/tarifs`, `/pro`, `/equipement`, `/contact` | Conversion | ✅ |
| `/blog`, `/blog/[slug]` (6 articles existants, puis ~2/mois) | Acquisition | ✅ |
| `/jet-lag/[trajet]` (ex. `paris-new-york`) | SEO longue traîne (D8) | ✅ |
| `/mentions-legales`, `/cgv`, `/confidentialite`, `/cookies` | Légal | ✅ |
| `/plan` (formulaire) | Outil | ✅ (page outil) |
| `/plan/resultat`, `/compte/*`, `/admin/*` | Privé | ❌ `noindex` + `Disallow` |

---

## 4. Modèle de données Supabase

Principe : **RLS activée sur toutes les tables, aucune policy publique d'écriture.** Les écritures publiques (événements, contact, consentement) passent par des route handlers qui valident (Zod), limitent le débit et écrivent avec la clé *service role* (jamais exposée au navigateur).

| Table | Colonnes clés | Accès |
|---|---|---|
| `admin_users` | `user_id`, `role` (`owner`/`analyst`/`support`), `created_at` | Lecture admin ; écriture `owner` |
| `entitlements` | `id`, `user_id`, `email`, `offer` (`voyage`/`annuel`/`ami`/`pro`), `stripe_session_id` *unique*, `stripe_payment_intent`, `amount_cents`, `currency`, `status`, `starts_at`, `expires_at`, `trip_credits` | Utilisateur : ses lignes ; admin : tout |
| `health_consents` | `user_id`, `purpose`, `policy_version`, `granted_at`, `withdrawn_at` | Propriétaire (lecture) ; service role (écriture) |
| `sleep_profiles` | `user_id`, `payload_enc` (chiffré : horaires, chronotype, âge, caféine, sieste, qualité), `key_id`, `updated_at` | Propriétaire uniquement |
| `medical_screenings` | `user_id`, `answers_enc` (chiffré : grossesse, traitements…), `melatonin_eligible` (booléen dérivé), `key_id`, `updated_at` | Propriétaire uniquement |
| `trips` | `id`, `user_id`, `entitlement_id`, `route_summary` (ex. `CDG-HND`), `inputs_enc` (chiffré), `plan_enc` (chiffré), `engine_version`, `created_at`, `delete_after` | Propriétaire uniquement |
| `rate_limits` | `key_hash`, `window_start`, `count` | Service role ; purge `pg_cron` |
| `stripe_events` | `id` (event id Stripe, *pk*), `type`, `processed_at` | Service role (idempotence) |
| `promo_codes` / `promo_redemptions` | code stocké en **HMAC salé**, offre, quota, expiration ; rédemptions | Service role ; admin |
| `events` | `ts`, `visitor_id` (UUID aléatoire du cookie de consentement), `session_id`, `name`, `path`, `referrer_host`, `utm_*`, `country`, `device_class`, `browser`, `props` (JSONB, sans PII), `consent_version` | Insert service role **uniquement si consentement `analytics`** ; lecture admin. **Partitionnée par mois**, rétention 13 mois. **Aucune colonne `user_id`** : pas de jointure possible avec les données de santé |
| `daily_stats` | agrégats jour × page × source (alimentée par `pg_cron`) | Lecture admin |
| `consent_logs` | `anon_id` (UUID), `choices`, `policy_version`, `ts`, `source` | Insert service role ; lecture admin (preuve art. 7 RGPD) |
| `contact_messages` | `name`, `email`, `subject`, `message`, `status`, `assignee`, `created_at` | Admin |
| `newsletter_subscribers` | `email`, `status` (`pending`/`confirmed`/`unsubscribed`), `consent_at`, `source`, `token_hash` | Service role ; admin |
| `email_events` | `resend_id`, `type` (delivered/bounced/complained/opened…), `ts` | Service role ; admin |
| `gsc_daily` | `date`, `query`, `page`, `clicks`, `impressions`, `ctr`, `position` | Admin |
| `audit_log` | `actor`, `action`, `target`, `ts`, `ip_hash` | Insert service role ; lecture `owner` |

- Fonction `public.is_admin(role text default null)` en `SECURITY DEFINER` utilisée par les policies admin.
- Aucune donnée de santé dans `events` ni dans les logs ; `props` est validé par liste blanche de clés.
- **Chiffrement applicatif des champs de santé** (`*_enc`) : AES-256-GCM dans une fonction serveur, clé dans les secrets Netlify, identifiant de version `key_id` pour permettre la rotation. Supabase chiffre aussi le disque et les sauvegardes, mais seul le chiffrement applicatif protège contre une lecture directe de la base (accès dashboard, export, fuite de sauvegarde).
- Les administrateurs **ne peuvent pas lire** les champs `*_enc` : ni policy RLS, ni clé de déchiffrement dans leur contexte. Le déchiffrement n'a lieu que dans la fonction serveur qui sert l'utilisateur propriétaire, ou lors d'une demande de droits (accès/portabilité), avec écriture dans `audit_log`.
- **Suppression en cascade** : supprimer le compte efface profil, dépistage, voyages et consentements de santé (`ON DELETE CASCADE`) ; les entitlements et factures sont conservés sans données de santé (obligation comptable).
- Migrations versionnées dans `supabase/migrations`, appliquées via la CLI ; projets **dev** et **prod** distincts ; tests RLS (pgTAP ou scripts SQL) dans la CI.
- Sauvegardes : plan Supabase Pro en production (sauvegardes quotidiennes ; PITR si le budget le permet). Le plan gratuit met le projet en pause après inactivité : inacceptable en production.

---

## 5. Moteur et planificateur

### 5.1 Extraction du moteur

1. Extraire le bloc `Fuseo circadian engine v2.0.0` (le prototype l'embarque sous forme de mini-bundle `__defs/__req`) vers `src/engine/` en **modules ES** (`model/`, `light/`, `melatonin/`, `sleep/`, `itinerary/`, `optimizer/`, `safety/`).
2. **Golden master d'abord** : avant tout refactor, générer ~25 jeux d'entrées représentatifs (Paris→Tokyo, Paris→New York, escales, retour court, mode *perform*, mélatonine on/off, chronotypes, observations) avec le **prototype exécuté dans Node**, figer les sorties JSON, puis exiger la parité exacte. Le refactor TypeScript se fait ensuite sous ce filet.
3. Typage progressif : types publics (`Itinerary`, `Profile`, `Plan`, `Intervention`) d'abord, interne ensuite.
4. **Sortie structurée, plus de texte** : le moteur renvoie `{type, start, end, reasonCode, params}` ; les phrases (`describe()`, `dayWhy()`, conseils) migrent dans `messages/*.json` avec ICU. C'est ce qui rend EN/ES fiables.
5. Base d'aéroports : sortir du code en dur (`data/airports.json`, ~120 lignes aujourd'hui) vers un jeu plus complet (OurAirports, licence domaine public) filtré sur les plateformes IATA principales, avec recherche tolérante (code, ville, nom).
6. Benchmark Node : l'optimiseur teste plusieurs stratégies avec des pas de 15 min. Mesurer sur 20 itinéraires ; **budget cible < 2 s** par plan. Au-delà : mémoïsation, pas adaptatif, ou exécution en *background function*.

### 5.2 API `/api/plan`

```
POST /api/plan   { profile, itinerary, preferences, medical? }
  → valide (Zod, bornes strictes : ≤ 8 vols, dates dans [−1 j ; +18 mois])
  → rate limit (fonction Postgres, clé = IP+UA hachés)
  → exécute le moteur
  → si utilisateur connecté ET consentement santé accordé : chiffre et enregistre
        sleep_profiles / medical_screenings / trips (D1, D5)
  → vérifie l'entitlement (cookie de session Supabase) :
        non payé → { days: 1..N gratuits, locked: M }, sans le reste
        payé     → plan complet (+ consomme le crédit voyage si nouveau, D2)
  → ne journalise ni profile ni medical
```

- **Sans compte** : l'aperçu gratuit se calcule sans rien enregistrer (rien n'est écrit en base ni en `localStorage` au-delà du brouillon local du formulaire, strictement nécessaire).
- **Avec compte** : à la création du compte, un écran dédié recueille le **consentement explicite au traitement des données de santé** (case non pré-cochée, finalité, durée, droit de retrait) ; sans ce consentement, aucun enregistrement. Le retrait supprime les données de santé.
- Le formulaire se pré-remplit depuis `sleep_profiles` pour les voyages suivants (multi-appareil).
- Le recalcul (« quelque chose a changé ? ») rappelle `/api/plan` avec les observations.
- PDF : `/api/plan/pdf` ; calendrier : `/api/plan/ics` ; tous deux exigent l'entitlement.
- Vue avancée (horloge heure par heure) : fournie par l'API uniquement si payé, ce qui évite d'exposer les traces du modèle.

### 5.3 Planificateur côté client

Composants React : `SleepStep`, `FlightsStep` (autocomplete aéroports accessible, combobox ARIA), `SettingsStep`, `MelatoninScreening`, `PlanView` (frises SVG), `Paywall`. Réutiliser le CSS et les SVG du prototype ; remplacer le rendu par chaînes HTML par des composants. Accessibilité clavier et lecteurs d'écran vérifiée (axe + Playwright).

---

## 6. Paiement et accès (Stripe)

```
Tarifs / Paywall ─► POST /api/checkout {offer, locale, cgvAccepted:true}
     ├─ vérifie la case CGV + renonciation (horodatée, versionnée, stockée avec la commande)
     ├─ crée une Checkout Session (client_reference_id, metadata{offer, trip_hint}, success/cancel URLs)
     └─ redirige vers Stripe
Stripe ─► POST /api/stripe/webhook   (checkout.session.completed, async_payment_succeeded,
                                      charge.refunded, charge.dispute.created)
     ├─ vérifie la signature (secret du webhook) ; rejette sinon
     ├─ idempotence : insert dans stripe_events (clé primaire = event.id)
     ├─ crée/associe l'utilisateur Supabase (e-mail Stripe) puis insère l'entitlement
     └─ envoie via Resend « Votre accès Fuseo » avec lien magique
Page /plan/merci?session_id=… : lit l'entitlement CÔTÉ SERVEUR (jamais la regex du prototype)
```

- **Accès multi-appareil** : lien magique Supabase (OTP e-mail) ; session persistée par cookie `httpOnly`. Corrige le défaut CGV §4 (« débloqué sur l'appareil utilisé »).
- **Annuel** : `expires_at = paid_at + 12 mois`, sans reconduction automatique (conforme à l'offre actuelle).
- **Remboursement / litige** : le webhook passe l'entitlement en `revoked`.
- **Codes « amis / testeurs »** : table `promo_codes` (HMAC salé), quota, expiration, rate limit anti-bruteforce ; plus aucun hash dans le JS public ; suppression de `?demo=ims`.
- **Factures et TVA** : Stripe Invoicing/Receipts ; vérifier la TVA applicable (prix TTC affichés, B2C France/UE) et la collecte via Stripe Tax si ventes UE hors France.
- **CGV** : ajouter la définition D2, le multi-appareil, et **désigner le médiateur de la consommation** (obligatoire).
- Tests : mode test Stripe + `stripe listen` en local ; test e2e « paiement → webhook → accès débloqué » ; test négatif « URL de succès forgée → toujours verrouillé ».

---

## 7. Mailing (Resend)

### 7.1 Mise en place

- Domaine d'envoi **`mail.fuseo.net`** (sous-domaine dédié, réputation isolée du domaine principal) : SPF, DKIM, **DMARC** (`p=none` au départ, puis `quarantine`), région Resend **UE**.
- Templates **React Email** versionnés, traduits FR/EN/ES, testés avec un rendu de prévisualisation.
- Clé API en variable d'environnement serveur uniquement ; envoi depuis un module `lib/resend` unique avec clés d'idempotence.

### 7.2 Catalogue des e-mails

| Type | Déclencheur | Base légale | Consentement |
|---|---|---|---|
| Accès au plan (lien magique) | Paiement / demande de connexion | Exécution du contrat | Non |
| Confirmation d'achat + facture | Webhook Stripe | Contrat / obligation légale | Non |
| Accusé de réception contact + notification admin | Formulaire de contact | Intérêt légitime / demande de l'utilisateur | Non |
| Rappels de voyage (J-3, J-1, arrivée) | Case cochée dans le planificateur | Consentement | **Oui, opt-in dédié** |
| Newsletter / conseils | Inscription | Consentement | **Double opt-in** (prospection B2C, art. L34-5 CPCE) |
| Notification Fuseo Pro (lead) | Contact avec sujet Pro | — | Interne |

### 7.3 Fiabilité et conformité

- **Webhook Resend** → `email_events` : bounces et plaintes alimentent une **liste de suppression** ; plus jamais d'envoi vers une adresse en rebond dur ou plaignante.
- En-têtes `List-Unsubscribe` + `List-Unsubscribe-Post` (désinscription en un clic) sur tout e-mail non transactionnel ; lien de désinscription visible dans le corps.
- Journalisation de l'horodatage, de la source et du texte de consentement.
- Rappels programmés : fonction planifiée Netlify ou `pg_cron` + route protégée ; envoi différé natif de Resend possible pour les rappels proches.
- Surveillance : taux de délivrabilité, rebonds et plaintes visibles dans l'admin (§12) ; Google Postmaster Tools sur `mail.fuseo.net`.

---

## 8. SEO et GEO (Generative Engine Optimization)

### 8.1 SEO technique

- **Metadata API** par page : `title` ≤ 60 car., `description` ≤ 155, canonical absolu, `alternates.languages` (hreflang `fr`, `en`, `es`, `x-default`), Open Graph et Twitter `summary_large_image` avec **image OG générée** (`opengraph-image.tsx`, par article et par trajet).
- `sitemap.ts` dynamique (pages + articles + trajets, `lastmod` réel, alternates), `robots.ts` (Disallow `/api`, `/admin`, `/compte`, `/plan/resultat`).
- **Données structurées JSON-LD**, générées par composants typés :
  `Organization` (+ `sameAs`), `WebSite`, `WebApplication` (+ `Offer` pour les 3 offres), `BreadcrumbList`, `Article`/`BlogPosting` (auteur `Person`, `reviewedBy` pour la relecture médicale, `dateModified`, `citation`), `FAQPage` (là où le contenu est réellement une FAQ), `Person` pour Dr Taieb et Dr Elbaz (`jobTitle`, `affiliation`, `sameAs`).
- **Core Web Vitals** : LCP < 2,5 s, INP < 200 ms, CLS < 0,1 ; budget JS par route ; animation du hero en composant client différé ; images AVIF/WebP via `next/image`.
- Redirections 301 propres ; pages 404 utiles ; pas de contenu masqué par `hidden` (le défaut actuel).
- Rendu **SSG/ISR** pour tout le marketing, ce qui garantit que les crawlers (y compris IA) voient le contenu complet sans JavaScript.

### 8.2 Stratégie de contenu (santé = YMYL)

- **E-E-A-T** : page équipe étoffée (diplômes, publications, liens vers l'Institut), mention « relu par … le … », sources en fin d'article (déjà fait), politique éditoriale, correction d'erreurs.
- **Clusters** : *Jet lag* (est/ouest, durée, enfants, sportifs) · *Lumière et horloge* · *Mélatonine* · *Sommeil en avion* · *Caféine et sieste* · *Préparation avant départ* + pages **trajets** (D8).
- Chaque page cible une intention (informationnelle → outil), avec un CTA vers le planificateur et des liens internes entre clusters.
- Calendrier : ~2 articles/mois, relecture médicale avant publication, mise à jour annuelle des articles évergreen.
- **Garde-fou pages trajets** : contenu unique (décalage en heures, sens, stratégie type calculée par le moteur, exemple de journée, FAQ spécifique) ; si le contenu n'apporte rien de plus, ne pas créer la page.

### 8.3 GEO — être cité par ChatGPT, Gemini, Perplexity, Claude, Copilot

| Levier | Mise en œuvre |
|---|---|
| **Réponse d'abord** | Chaque page commence par une réponse directe de 40-60 mots, puis le détail (format que les moteurs génératifs extraient) |
| **Faits citables** | Chiffres sourcés, définitions courtes, tableaux comparatifs ; chaque affirmation médicale renvoie à une référence |
| **Entités claires** | Marque *Fuseo*, éditeur SLEEPTECHNOLOGY, auteurs identifiés, `sameAs` (LinkedIn, site de l'Institut, Wikidata si éligible) |
| **Fraîcheur** | `dateModified` visible et réel |
| **Accès des robots IA** | Décision explicite dans `robots.txt` : autoriser `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`/`ClaudeBot`, `Google-Extended`, `Bingbot` pour être cité ; choisir séparément pour les robots d'entraînement (GPTBot, CCBot…) |
| **`/llms.txt`** | Résumé du site et liens vers les pages clés en Markdown. Coût quasi nul ; effet non démontré, à traiter comme un bonus |
| **Bing Webmaster Tools + IndexNow** | Bing alimente plusieurs réponses IA ; IndexNow notifie les nouvelles URL |
| **Mesure** | Dans GA4, canal personnalisé « IA » (referrers `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`, `claude.ai`) ; suivi trimestriel manuel d'un panel de ~30 questions types dans les moteurs IA (citation oui/non) |

---

## 9. Mesure et analytics

| Outil | Usage | Chargement |
|---|---|---|
| **Statistiques internes** (Supabase) | Back-office : pages vues, visiteurs, entonnoir, trajets demandés | **Après consentement « mesure d'audience » uniquement** (§10.1). Sans consentement : aucun événement envoyé |
| **Google Tag Manager → GA4** | Acquisition, campagnes, attribution | **Après consentement uniquement**, Consent Mode v2 |
| **Microsoft Clarity** | Heatmaps et replays | Après consentement ; **jamais** sur `/plan`, `/compte`, `/admin` ; masquage intégral des champs |
| **Google Search Console** | Indexation, requêtes, positions | Propriété *Domaine* validée par DNS TXT ; sitemap soumis ; API pour import quotidien dans `gsc_daily` |
| **Bing Webmaster Tools** | Indexation Bing/Copilot | Import depuis GSC |
| **Core Web Vitals réels (RUM)** | Données terrain | `web-vitals` → `/api/events`, agrégé dans l'admin |

**Plan d'événements** (reprise des noms du prototype, enrichis) :

`page_view` · `hero_cta_click` · `plan_started` · `flight_added` · `plan_generated {route, strategy}` · `preview_viewed {locked_days}` · `checkout_started {offer}` · `purchase_completed {offer}` *(confirmé par le webhook Stripe, pas par le navigateur)* · `code_redeemed` · `pdf_downloaded` · `ics_downloaded` · `plan_observation {type}` · `pro_contact` · `newsletter_subscribed` · `consent_updated` · `web_vital`.

Règle : aucune propriété d'événement ne contient d'horaires de sommeil, de réponses médicales ni d'e-mail. Le trajet (`CDG-HND`) est autorisé car il n'identifie personne.

> Toutes les statistiques d'audience ne couvrent que les visiteurs ayant accepté. **Les chiffres de revenu, de ventes et de comptes viennent de Stripe et de la base** (exhaustifs, sans consentement car liés au contrat). Le back-office affiche le **taux de consentement** à côté de chaque indicateur d'audience pour éviter les mauvaises lectures.
>
> Les événements d'usage du produit (`plan_generated`, `pdf_downloaded`…) sont émis par le navigateur **uniquement si le consentement est accordé** ; le comptage exhaustif des plans générés et des achats se lit dans `trips` et `entitlements` (sans contenu de santé), pas dans `events`.

---

## 10. Conformité RGPD / CNIL

### 10.1 Bannière de consentement

Conforme aux lignes directrices CNIL :

- Boutons **« Tout accepter » et « Tout refuser » au même niveau**, même taille, même style, dès le premier écran ; « Personnaliser » à côté.
- **Pop-up discret en bas à gauche** (carte flottante, pas de plein écran, ne masque pas le contenu ni le bouton « Créer mon plan » sur mobile : sur petit écran, bandeau compact en bas), apparaissant à la première visite jusqu'au choix. Navigation au clavier, focus piégé non bloquant, `role="dialog"` non modal.
- **Aucun traceur non essentiel avant le choix** ; pas de case pré-cochée ; pas de *cookie wall*.
- Finalités détaillées : *Nécessaires* (sans consentement : session, panier, consentement lui-même) · *Mesure d'audience* (statistiques internes Fuseo, GA4/GTM, Clarity) · *Marketing* (vide pour l'instant, prévu si Google Ads).
- Le consentement « mesure d'audience » est **distinct** du consentement au traitement des données de santé (§10.4) : refuser les cookies n'empêche ni d'utiliser le service, ni de créer un compte.
- La **page `/cookies`** reprend les mêmes choix (interrupteurs par finalité, boutons « Tout accepter » / « Tout refuser », historique de la décision) et la liste précise des traceurs ; le lien « Gérer mes cookies » du pied de page rouvre le pop-up.
- Retrait aussi simple que l'acceptation : lien **« Gérer mes cookies »** permanent dans le pied de page.
- Durée de validité du choix : **6 mois**, puis nouvelle demande ; cookie `fuseo_consent` (version de la politique + choix) limité à 13 mois maximum.
- **Preuve du consentement** (art. 7 RGPD) : écriture dans `consent_logs` (identifiant aléatoire, choix, version, horodatage, **sans IP**).
- Implémentation maison (légère, ~5 Ko) avec **Consent Mode v2** : GTM/GA4/Clarity **ne sont pas injectés** tant que `analytics` n'est pas accordé (mode « basique », le plus prudent pour la CNIL). Tests Playwright : *zéro requête vers googletagmanager / google-analytics / clarity.ms avant acceptation*, y compris après refus.

### 10.2 Pages et registre

- `/confidentialite` (réécrite) : responsable de traitement, finalités, bases légales, durées de conservation, **sous-traitants** (Netlify, Supabase, Stripe, Resend, Google, Microsoft, Cloudflare, Sentry) et **transferts hors UE** (clauses contractuelles types / Data Privacy Framework), droits et exercice, CNIL.
- `/cookies` séparée : liste des traceurs, finalités, durées, mode de refus.
- **Registre des traitements** (art. 30) dans `docs/` ; DPA signés avec chaque sous-traitant ; **screening AIPD** (D5) ; procédure de notification de violation (72 h) ; procédure d'exercice des droits (accès, effacement, portabilité) avec endpoint admin d'export/suppression.
- Durées de conservation proposées : événements 13 mois, consentements 13 mois après expiration, messages de contact 3 ans, factures 10 ans, comptes inactifs 3 ans, **données de santé : supprimées 12 mois après la fin du dernier voyage ou au retrait du consentement / suppression du compte** (le plus tôt).
- **Polices auto-hébergées** (`next/font`) : fin du transfert d'IP à Google Fonts. jsPDF n'est plus chargé depuis un CDN tiers.
- Région UE pour Supabase, Resend et, quand le plan Netlify le permet, pour les fonctions (la région par défaut est aux États-Unis : à régler explicitement).

### 10.3 Statistiques internes sous consentement

Choix validé (D4) : les statistiques internes sont traitées comme un traceur soumis au consentement, sans s'appuyer sur l'exemption CNIL.

- Accord « mesure d'audience » → le script émet les événements vers `/api/events` ; le serveur vérifie que le cookie de consentement est présent et valide **avant d'écrire** (double contrôle côté serveur, pas seulement côté navigateur).
- Identifiant visiteur : UUID aléatoire dans le cookie `fuseo_vid`, créé **uniquement après accord**, 13 mois maximum, supprimé au retrait du consentement.
- IP jamais stockée ; pays déduit de l'en-tête CDN ; user-agent réduit à une classe d'appareil et de navigateur.
- Refus ou absence de choix : aucun événement, aucun cookie `fuseo_vid`, aucun appel à GTM, GA4 ou Clarity.
- Cloisonnement : `events` n'a pas de `user_id` et n'est jamais jointe aux tables de santé.

### 10.4 Données de santé stockées dans Supabase (art. 9 RGPD)

Le choix de tout enregistrer (D5) place les horaires de sommeil, les réponses du questionnaire (grossesse, anticoagulants, épilepsie…) et les plans dans la catégorie des **données concernant la santé**. Exigences :

1. **Base légale** : consentement explicite (art. 9.2.a), recueilli séparément du consentement aux cookies, de l'acceptation des CGV et de la politique de confidentialité ; preuve dans `health_consents` ; retrait aussi simple que l'octroi (bouton dans `/compte`).
2. **AIPD (analyse d'impact) obligatoire** avant ouverture : traitement à grande échelle potentiel de données sensibles, public pouvant inclure des personnes vulnérables. Documenter risques, mesures, risque résiduel ; consultation de la CNIL si le risque résiduel reste élevé.
3. **Vérification HDS (hébergeur de données de santé)** : la certification HDS est exigée lorsque des données de santé sont collectées « à l'occasion d'activités de prévention, de diagnostic, de soins ou de suivi médico-social ». Supabase n'est pas certifié HDS. Fuseo se présente comme un service de bien-être et de conseils généraux, mais le lien avec l'Institut Médical du Sommeil et le vocabulaire « sommeil / santé » peuvent rapprocher le service de la prévention. **Avis juridique écrit à obtenir avant la phase 4**, car cela peut modifier l'hébergement. Si un risque est identifié, repli possible sans changer de stack : ne stocker que les données dérivées (`melatonin_eligible`, plans) et garder le questionnaire détaillé uniquement le temps du calcul.
4. **Mesures techniques** : chiffrement applicatif (§4), RLS propriétaire-seul, administrateurs sans accès au contenu, journal d'audit des accès, sauvegardes chiffrées, région UE, sous-traitants avec DPA, test de restauration.
5. **Information** : politique de confidentialité dédiée aux données de santé (finalités, destinataires, durées, droits).
6. **Droits** : export (portabilité) et suppression en self-service depuis `/compte`, avec confirmation par e-mail Resend.
7. **Violation de données** : procédure de notification CNIL sous 72 h et information des personnes si risque élevé.

---

## 11. Sécurité

### 11.1 Application

| Sujet | Mesure |
|---|---|
| **En-têtes** | `Content-Security-Policy` stricte avec *nonce* généré dans le `middleware` (`default-src 'self'`, `script-src 'self' 'nonce-…' 'strict-dynamic'`, domaines GTM/GA/Clarity/Stripe/Turnstile ajoutés **uniquement** si consentement/route), `Strict-Transport-Security` (preload), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale, `frame-ancestors 'none'`, COOP |
| **Entrées** | Zod sur 100 % des entrées API ; bornes de taille ; rejet des champs inconnus ; échappement systématique (React) ; MDX sans HTML brut non maîtrisé |
| **Abus** | Rate limiting par route (`/api/plan`, `/api/contact`, `/api/newsletter`, `/api/events`, promo, connexion) ; Turnstile sur contact/newsletter/promo ; limite de taille de corps |
| **Secrets** | Variables Netlify par contexte ; clé *service role* et clés Stripe/Resend **serveur uniquement** (`server-only`) ; `.env.example` sans valeur ; `gitleaks` en pré-commit et CI |
| **Dépendances** | Verrouillage du lockfile, Dependabot, `npm audit` en CI, SRI si script externe inévitable |
| **Erreurs / logs** | Pas de PII, ni profil, ni réponses médicales dans les logs ; Sentry avec scrubbing ; messages d'erreur génériques côté client |
| **CSRF / CORS** | Contrôle d'`Origin` sur les mutations ; pas de CORS ouvert ; cookies `httpOnly`, `secure`, `sameSite=lax` |

### 11.2 Supabase

- **RLS partout**, politique par défaut = refus ; tests automatisés qui prouvent qu'un utilisateur anonyme ou authentifié non-admin ne lit rien d'interdit.
- Côté serveur : `supabase.auth.getUser()` (validation par le serveur Auth), jamais `getSession()` seul, pour toute décision d'accès.
- Clé *service role* limitée aux route handlers/fonctions planifiées ; clé `anon` seule côté navigateur.
- Désactiver l'inscription publique (sauf lien magique à l'achat) ; politique de mots de passe forte pour les comptes admin ; expiration des liens magiques courte (≤ 1 h).
- Exécuter `get_advisors` / lints Supabase (sécurité et performance) avant chaque mise en production.

### 11.3 Authentification admin

- Comptes créés **manuellement** (invitation) ; table `admin_users` ; aucun auto-enrôlement.
- **MFA TOTP obligatoire** (niveau AAL2 vérifié côté serveur) avant tout accès à `/admin` et aux routes `/api/admin/*`.
- Double verrou : `middleware` (redirection) **et** vérification dans chaque loader/action **et** RLS (`is_admin()`).
- `noindex`, `Disallow`, en-têtes `no-store`, session courte, déconnexion sur inactivité.
- **Journal d'audit** de toute action sensible (export, suppression, remboursement, changement de rôle).
- Rôles : `owner` (tout), `analyst` (stats en lecture), `support` (messages, accès clients, sans stats financières détaillées).

---

## 12. Mode admin (back-office)

Route `/admin`, thème sobre, responsive, accessible. Plage de dates globale (aujourd'hui, 7 j, 30 j, 90 j, personnalisée), comparaison avec la période précédente, export CSV.

| Section | Contenu |
|---|---|
| **Vue d'ensemble** | Visiteurs uniques, pages vues, sessions, taux de rebond, plans générés, ventes, **revenu (Stripe)**, taux de conversion global, tendance |
| **Audience** | Pages les plus vues, sources/médiums/UTM, **canal IA**, pays/régions, appareils/navigateurs, langues, nouveaux vs récurrents (via GA4 si consent), Core Web Vitals réels |
| **Entonnoir** | `visite → plan_started → plan_generated → preview_viewed → checkout_started → purchase_completed`, avec taux d'abandon par étape et par source |
| **Usage du produit** | Trajets les plus demandés (paires d'aéroports, lus dans `trips.route_summary`), stratégies choisies, part *perform* vs *adapt*, PDF/.ics téléchargés, recalculs, distribution des décalages horaires. **Uniquement des agrégats** : aucun accès aux champs de santé chiffrés, seuils minimaux d'affichage (pas de groupe < 5 personnes) |
| **Utilisateurs & accès** | Liste des comptes, entitlements (offre, dates, statut), recherche par e-mail, révocation, octroi manuel, codes promo (création, quota, rédemptions) |
| **Ventes** | Commandes, remboursements, litiges, revenu par offre, panier moyen, LTV simple ; lien direct vers Stripe |
| **E-mails** | Envoyés/délivrés/rebonds/plaintes (Resend), abonnés newsletter (pending/confirmed/unsub), bouton d'envoi d'un broadcast de test |
| **Messages** | Boîte de réception des contacts (statut, assignation, réponse via Resend), filtre « Fuseo Pro » |
| **SEO** | Impressions/clics/position moyenne (import Search Console), top requêtes, pages qui montent/chutent, statut d'indexation des URL du sitemap |
| **Consentement** | Taux d'acceptation/refus/personnalisé par période et par pays, version de politique en vigueur |
| **Santé du site** | Erreurs récentes (Sentry), dernier déploiement, état des webhooks Stripe/Resend, échecs de crons |
| **RGPD** | Export/suppression d'un utilisateur (demande de droits), journal d'audit |

Implémentation : composants serveur interrogeant des **vues matérialisées / `daily_stats`** (pas de scan de la table `events` brute), rafraîchies par `pg_cron` ; graphiques Recharts ; requêtes typées via les types générés par Supabase (`supabase gen types`).

---

## 13. Performance, accessibilité, qualité

- **Budgets** : JS initial ≤ 120 Ko gzip sur les pages marketing ; planificateur chargé à la demande ; `prefers-reduced-motion` respecté ; images dimensionnées.
- **Accessibilité** : WCAG 2.2 AA / RGAA (viser un taux de conformité documenté et une déclaration d'accessibilité) ; combobox aéroports, focus visible, contrastes vérifiés, textes alternatifs, libellés de formulaires, annonces `aria-live` pour le plan.
- **Tests** :
  - *Unitaires* (Vitest) : moteur, utilitaires de fuseaux, schémas Zod.
  - *Golden master* : parité avec le prototype (voir §5.1).
  - *E2E* (Playwright) : parcours plan gratuit, paiement Stripe test, lien magique, **paywall (le plan complet n'apparaît jamais dans la réponse réseau sans droit)**, bannière (aucun tag avant consentement), formulaire contact, admin (anonyme → refus, non-admin → refus, admin sans MFA → refus).
  - *Sécurité* : tests RLS, `zap-baseline` ou équivalent sur la preview, revue des en-têtes (securityheaders, Mozilla Observatory).
  - *Qualité de page* : Lighthouse CI (perf ≥ 90, a11y ≥ 95, SEO = 100) bloquant sur les PR.
- **CI** (GitHub Actions) : typecheck, lint, tests, build, Lighthouse, audit des dépendances, gitleaks ; déploiement Netlify automatique ; **migrations Supabase appliquées par pipeline** après validation.

---

## 14. Feuille de route

Estimation pour une personne à temps plein ; à ajuster selon la disponibilité du contenu juridique et des relectures médicales.

| Phase | Durée | Livrables | Critères d'acceptation |
|---|---|---|---|
| **0. Cadrage** | 3 j | D1, D4, D5 validées (D2, D3, D6-D8 à confirmer) ; comptes créés (Netlify, Supabase UE dev+prod, Stripe, Resend, Cloudflare, GA4/GTM, Search Console, Clarity, GitHub) ; **connexion MCP au projet Supabase Fuseo** ; domaine `fuseo.net` ; médiateur choisi ; **lancement de l'AIPD et demande d'avis juridique HDS** | Accès à tous les comptes ; AIPD amorcée ; avis HDS demandé |
| **1. Fondations** | 4 j | Repo Next.js TS strict, CI, `netlify.toml`, 3 environnements, design tokens extraits du CSS, layout, i18n squelette, polices et images optimisées, `.env.example` | Déploiement preview OK ; lint/typecheck/tests verts |
| **2. Moteur** | 5-6 j | Golden master du prototype ; `src/engine` en TS ; sortie structurée ; base d'aéroports ; benchmark | **Parité exacte** sur les ~25 cas ; < 2 s par plan |
| **3. Site marketing + SEO** | 6-7 j | Toutes les pages, 6 articles en MDX, composants JSON-LD, sitemap/robots/OG, 1ʳᵉ série de pages trajets, FR complet | Lighthouse SEO 100, validation Rich Results, HTML complet sans JS |
| **4. Planificateur** | 6-7 j | Formulaire 3 étapes, `/api/plan`, vue plan, aperçu gratuit, PDF/.ics serveur | Parcours complet e2e ; réponse gratuite sans données payantes |
| **5. Paiement & accès** | 4 j | Checkout serveur, webhook, entitlements, lien magique, codes promo serveur, e-mails transactionnels | E2E paiement test ; URL forgée refusée ; remboursement révoque l'accès |
| **6. RGPD & mesure** | 5 j | Pop-up bas gauche + page `/cookies`, `consent_logs`, GTM/GA4/Clarity et événements internes conditionnels, consentement santé (`health_consents`), chiffrement des champs, export/suppression self-service, pages légales réécrites, registre, AIPD finalisée | **0 requête tierce et 0 événement avant consentement** ; preuve de consentement en base ; admin sans accès aux champs chiffrés |
| **7. Admin** | 6-7 j | Auth admin + MFA, sections §12, rollups `pg_cron`, import Search Console, audit log | Non-admin refusé (UI + RLS) ; chiffres rapprochés de Stripe |
| **8. Mailing avancé** | 2-3 j | Newsletter double opt-in, rappels de voyage, webhook Resend, suppression list | Désinscription 1 clic ; bounce → suppression automatique |
| **9. Durcissement** | 3-4 j | CSP finale, rate limits, tests RLS, a11y, performance, revue sécurité, pen-test léger | Observatory ≥ A ; aucun finding critique/élevé |
| **10. EN/ES + trajets** | 4-5 j | Messages EN/ES relus, hreflang, pages trajets étendues | Pas de chaîne française dans `/en`, `/es` |
| **11. Go-live** | 2 j | DNS, vérification Search Console/Bing, soumission sitemap, monitoring, runbook, sauvegardes, tests en conditions réelles (achat réel remboursé) | Checklist §16 complète |

**Chemin critique** : D1 (décision) → phase 2 (moteur) → phases 4-5. Les phases 3 et 6 peuvent avancer en parallèle d'une partie des phases 2 et 4.

**Post-lancement (mois 1-3)** : suivi Search Console hebdomadaire, 2 articles/mois, extension des pages trajets, tests A/B des tarifs et du paywall, revue trimestrielle de la visibilité IA.

---

## 15. Coûts récurrents indicatifs

À vérifier au moment de la souscription ; les grilles évoluent.

| Poste | Ordre de grandeur |
|---|---|
| Netlify (plan payant pour usage commercial, équipes, région des fonctions) | ~20-25 €/mois |
| Supabase Pro (sauvegardes, pas de pause) | ~25 €/mois |
| Resend | gratuit au démarrage, ~20 $/mois au-delà |
| Stripe | ~1,5 % + 0,25 € par carte européenne (+ marge pour les cartes hors UE) |
| Sentry, Turnstile, GA4, GSC, Clarity, Bing | gratuits à ce volume |
| Nom de domaine | ~15 €/an |

---

## 16. Risques, hypothèses et points ouverts

| Risque / question | Mitigation |
|---|---|
| Le moteur est trop lent côté serveur | Benchmark dès la phase 2 ; repli : exécution client pour l'aperçu + serveur pour le plan complet |
| Parité du moteur non garantie après refactor | Golden master avant toute modification |
| Taux de refus élevé : statistiques d'audience incomplètes | Taux de consentement affiché dans l'admin ; chiffres d'affaires et comptes lus dans Stripe et la base ; libellés clairs et honnêtes dans le pop-up |
| **Obligation HDS** pour des données de santé hébergées chez Supabase (non certifié) | Avis juridique écrit avant la phase 4 ; repli : ne conserver que les données dérivées, ou héberger les champs de santé chez un hébergeur HDS |
| **Fuite de la base** exposant des données de santé | Chiffrement applicatif, RLS, admins sans accès, journal d'audit, sauvegardes chiffrées, procédure de violation 72 h |
| AIPD non finalisée à la date de lancement | Elle conditionne l'ouverture des comptes ; à lancer en phase 0 |
| Revendications médicales (« recalage », « adaptation ») | Relecture médicale systématique, mentions « ne remplace pas un avis médical » conservées, pas de promesse de résultat |
| Contenu généré en masse pénalisé par Google | Pages trajets limitées et réellement différenciées |
| Les moteurs IA ne citent pas le site | Travail sur les entités, les sources, la fraîcheur ; la mesure reste empirique, aucune garantie |
| Plan Netlify / région des fonctions | Vérifier avant la phase 1 ; sinon, rapprocher les fonctions sensibles de Supabase UE |
| Dépendance Stripe/Resend/Google (hors UE) | DPA + clauses types / DPF documentés dans le registre |

**Points à fournir par vous :** médiateur de la consommation retenu · décision sur D1-D8 · accès aux comptes · textes de relecture médicale · logos et photos en haute définition (les originaux sont intégrés en base64 dans le prototype) · liste des trajets prioritaires · adresse d'expédition des e-mails (`contact@fuseo.net`, `no-reply@mail.fuseo.net`).

---

## 17. Checklist de mise en production

- [ ] DNS : `fuseo.net` → Netlify ; HTTPS forcé ; `www` → apex (ou inverse) en 301
- [ ] SPF, DKIM, DMARC valides sur `mail.fuseo.net` ; test d'envoi réel
- [ ] Stripe en mode live, webhook live configuré, achat réel puis remboursement testé
- [ ] Supabase prod : RLS vérifiée, advisors sans alerte, sauvegardes actives, MFA admin actif, projet UE
- [ ] Variables d'environnement prod ; aucune clé de test restante ; secrets absents du dépôt
- [ ] CSP/HSTS en prod ; Observatory ≥ A ; aucune erreur CSP dans la console
- [ ] Pop-up bas gauche : refus ou absence de choix → aucun tag, aucun cookie `fuseo_vid`, aucun événement reçu côté serveur ; acceptation → statistiques internes, GA4 et Clarity actifs ; « Gérer mes cookies » et `/cookies` fonctionnent
- [ ] Santé : AIPD signée ; avis HDS obtenu ; consentement santé séparé et tracé ; champs `*_enc` illisibles depuis le dashboard Supabase et par un compte admin ; export et suppression de compte testés ; test de restauration de sauvegarde
- [ ] Pages légales à jour (mentions, CGV avec médiateur, confidentialité, cookies) ; registre RGPD rempli
- [ ] Search Console (propriété domaine) validée, sitemap soumis ; Bing Webmaster importé ; IndexNow actif
- [ ] Rich Results Test sans erreur ; hreflang valides ; canonical corrects ; `noindex` sur les zones privées
- [ ] GA4 : flux de données, événements clés (`purchase_completed`) marqués comme conversions, lien GSC et Clarity
- [ ] Lighthouse mobile ≥ 90 sur accueil, tarifs, un article, `/plan`
- [ ] Sentry et monitoring de disponibilité actifs ; runbook d'incident et de restauration rédigé
- [ ] Test d'accès admin : anonyme refusé, compte sans MFA refusé, `analyst` sans droits d'écriture
