# Runbook (à compléter avant le go-live)

- **Incident** : Netlify > Deploys (rollback en un clic) ; Supabase > Logs ; Stripe > Developers > Webhooks (rejeu).
- **Violation de données** : notification CNIL sous 72 h ; information des personnes si risque élevé ; journal dans `audit_log`.
- **Rotation de clé de chiffrement** : ajouter un `key_id`, rechiffrer en tâche planifiée, retirer l'ancienne clé.
- **Restauration** : test de restauration de sauvegarde Supabase avant mise en production.
- **Secrets** : saisis uniquement dans Netlify (Environment variables) ; jamais dans le dépôt ni la conversation.
