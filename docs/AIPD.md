# AIPD — analyse d'impact (squelette)

Statut : **non finalisée**. Conditionne l'ouverture en production de la collecte de santé (PLAN §10.4).

1. **Description** : données de santé traitées (horaires de sommeil, réponses du questionnaire de sécurité mélatonine, plans), flux, hébergement (Supabase UE), chiffrement applicatif, durées.
2. **Nécessité et proportionnalité** : finalité, minimisation (données dérivées possibles), durées, information, droits (accès, export, effacement).
3. **Risques** : accès illégitime (fuite de base, sauvegarde, accès dashboard), modification non désirée, disparition ; sources, impacts, vraisemblance.
4. **Mesures** : chiffrement AES-256-GCM avec `key_id`, RLS propriétaire seul, admins sans accès, journal d'audit, sauvegardes chiffrées, DPA, procédure de violation 72 h.
5. **Risque résiduel** et avis : à compléter par Jordan avec le DPO / conseil ; consultation CNIL si risque résiduel élevé.
6. **HDS** : avis juridique écrit à obtenir (Supabase n'est pas certifié HDS). Repli : ne conserver que les données dérivées.
