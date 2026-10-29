# Fuseo — site web

Plan anti-jet lag personnalisé. Next.js (App Router, TypeScript strict) · Supabase · Netlify.
Architecture et feuille de route : [docs/PLAN-REFONTE.md](docs/PLAN-REFONTE.md).

## Démarrer

```bash
cp .env.example .env.local   # puis renseigner les valeurs (jamais commitées)
npm install
npm run dev                  # http://localhost:3000
```

## Contrôles

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                     # Vitest
npm run test:e2e             # Playwright (build + serveur sur le port 3100)
npm run build
```

## Conventions

- Composants serveur par défaut ; `'use client'` seulement si nécessaire.
- Toute entrée externe est validée avec Zod ; variables d'environnement dans `src/env.ts`.
- Toute modification de schéma Supabase : une migration dans `supabase/migrations/` (même contenu que celle appliquée), RLS activée dès la création, puis régénération de `src/lib/supabase/database.types.ts`.
- Aucun secret dans le dépôt ni dans le code client ; aucune donnée de santé réelle dans les tests ou les logs.
