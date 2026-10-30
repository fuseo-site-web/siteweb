# Audit SEO et GEO de fuseo.net : où nous en sommes, comment atteindre 10/10

Audit du 30 octobre 2026. Sources : Lighthouse sur le site en ligne, audit Ahrefs du 29 octobre, explorateur interne (78 pages), lecture du code.
GEO = *Generative Engine Optimization* : être cité par ChatGPT, Perplexity, Gemini, Claude, Copilot et les « AI Overviews » de Google.

## 1. Note actuelle (honnête)

| Domaine | Note | Pourquoi |
|---|---|---|
| SEO technique | **8,5 / 10** | Site rapide, propre, bien structuré. Les erreurs Ahrefs de cette semaine sont corrigées dans le code. |
| SEO on-page (titres, descriptions, structure) | **8 / 10** | Corrigé cette semaine ; reste le contenu long et les FAQ. |
| Contenu et E-E-A-T (sujet santé = « YMYL ») | **6 / 10** | Sources scientifiques solides (29 références), mais auteurs peu visibles et seulement 6 articles. |
| Autorité (liens entrants) | **0,5 / 10** | Ahrefs : DR 0, 0 domaine référent, 0 mot-clé positionné. Le site est tout neuf. |
| GEO (visibilité dans les IA) | **5,5 / 10** | Bonne base technique (score IA Ahrefs 99/100), mais peu de contenu citable et aucune présence hors du site. |

Lighthouse (mobile, site en ligne) : performance 93, accessibilité 100, bonnes pratiques 96, SEO 100. Seul point à travailler : le plus gros élément affiché arrive à 2,9 s (objectif Google : moins de 2,5 s).

## 2. Déjà fait (cette semaine)

- Erreurs 500 sur les articles dans la mauvaise langue : vraies 404, et le sélecteur de langue renvoie vers la traduction.
- Redirections internes `/fr/...`, hreflang cassés, doublons de langue.
- Titres de 20 à 60 caractères, descriptions de 70 à 155 caractères sur toutes les pages.
- Image de partage 1200 × 630, cartes X (Twitter) et Open Graph complètes, `og:locale` correct, favicon et manifeste.
- Données structurées : Organisation et Site sur l'accueil, correction de la page équipe, un seul fil d'Ariane par article.
- `llms.txt` (présentation du site pour les IA), `robots.txt` ouvert à tous les robots.
- Mesure : ChatGPT, Perplexity, Gemini, Claude, Google… sont reconnus comme sources dans l'espace admin.

## 3. Chemin vers le 10/10

### A. Technique (1 à 2 semaines, je peux tout faire)
1. **Vitesse** : ramener le plus gros élément sous 2,5 s (précharger l'image ou le texte principal, alléger 100 Ko de JavaScript inutilisé, retirer le blocage de rendu de 190 ms). Gain attendu : performance 97+.
2. **Données structurées par type de page** :
   - articles : `Article` avec **auteur nommé** (Dr Taieb, Dr Elbaz), `dateModified`, `reviewedBy` et date de relecture médicale ;
   - tarifs : `Offer` ;
   - planificateur : `WebApplication` ;
   - méthode : `HowTo` ;
   - pages santé : `MedicalWebPage`.
3. **Plan du site** : dates de dernière modification fiables, plan d'images.
4. **IndexNow + Bing Webmaster Tools** : ChatGPT Search et Copilot s'appuient sur l'index de Bing. Je peux brancher l'envoi automatique à chaque publication (vous créez le compte Bing).
5. **Politique de sécurité du contenu (CSP)** et suivi des erreurs : déjà prévus au plan.
6. **Données de terrain** : après quelques semaines de trafic, vérifier les Core Web Vitals réels dans Search Console.

### B. Contenu (le plus gros levier, 2 à 3 mois)
1. **De 6 à 30 articles**, chacun de 1 200 mots ou plus, avec :
   - une réponse directe en 40 à 60 mots dès le début (c'est ce que les IA citent) ;
   - un résumé « à retenir », des tableaux, des chiffres sourcés ;
   - 4 à 6 questions-réponses en fin d'article.
2. **Pages « trajet »** : « Jet lag Paris–Tokyo », « Paris–New York »… avec le décalage et la durée calculés par le moteur Fuseo. Ce sont les pages que les voyageurs et les IA cherchent, et vous êtes seuls à pouvoir les rédiger avec des données propres.
3. **Une page pilier « jet lag »** qui relie tous les articles (cocon sémantique).
4. **Mots-clés visés** : « jet lag », « comment éviter le jet lag », « jet lag New York », « mélatonine jet lag », « calculateur jet lag », « dormir en avion ».
5. **Pages courtes à étoffer** : tarifs (318 mots), Fuseo Pro (256), transparence (244), avec FAQ.
6. **Images** : descriptions utiles, formats modernes, visuels originaux (le blog accepte déjà le glisser-déposer en WebP).
7. **Tout texte médical relu** par le Dr Taieb avant publication, avec la date de relecture affichée.

### C. Confiance (E-E-A-T), indispensable pour la santé
- Auteur visible sur chaque article (photo, titre, lien vers sa page).
- Mention « Relu médicalement par… le… ».
- Page « Politique éditoriale » : comment les contenus sont rédigés, sourcés, mis à jour.
- Preuves des mentions presse (TF1, Le Figaro, RTL, France 2) : lien vers chaque article.
- Mise à jour trimestrielle des articles, avec la date bien visible.

### D. Autorité hors du site (indispensable, 3 à 6 mois)
- **Lien depuis le site de l'Institut Médical du Sommeil** vers fuseo.net (le plus facile et le plus puissant).
- **Relations presse** : transformer les mentions existantes en liens ; proposer des chiffres originaux aux journalistes (ex. « les trajets où le jet lag dure le plus »).
- Profils cohérents (même nom, même description) : LinkedIn, Google Business Profile pour l'Institut, Crunchbase, **Wikidata** puis Wikipédia quand les sources le permettent. J'ajouterai les liens `sameAs` dès que vous me donnez les adresses.
- Présence dans les comparatifs « meilleures applications anti-jet lag », forums de voyageurs, Reddit, YouTube (les IA citent beaucoup les transcriptions vidéo).

### E. GEO : être cité par les IA
1. **Accès** : fait (`robots.txt` ouvert, pages en HTML, `llms.txt`). Décision à prendre : autoriser aussi les robots « d'entraînement » (GPTBot, ClaudeBot, Google-Extended). Je recommande oui pour la notoriété de la marque.
2. **Contenu citable** : phrases courtes et factuelles, définitions, chiffres sourcés, tableaux. Les IA citent ce qui répond clairement à une question.
3. **Données originales** : chiffres issus du moteur Fuseo (durée de récupération par trajet) : rien n'est plus citable qu'une donnée que personne d'autre n'a.
4. **Cohérence de l'entité** : le nom, la description et l'équipe doivent être identiques partout (site, Institut, LinkedIn, presse).
5. **Fraîcheur** : dates de mise à jour visibles et dans les données structurées.
6. **Mesure** :
   - visites venant de chatgpt.com et autres IA : déjà dans l'admin, canal « Assistants IA » ;
   - Ahrefs Brand Radar (dans votre compte) pour les citations ;
   - Bing Webmaster Tools ;
   - test mensuel de 30 questions types dans ChatGPT, Perplexity, Gemini et Claude, avec un tableau de suivi.

## 4. Ordre conseillé

| Quand | Quoi | Qui |
|---|---|---|
| Cette semaine | Pousser les corrections, relancer le crawl Ahrefs, demander l'indexation de l'accueil dans Search Console, créer Bing Webmaster Tools | Vous (comptes) + moi |
| Semaines 2 à 3 | Vitesse, données structurées complètes, IndexNow, auteurs et relecture médicale visibles | Moi |
| Mois 1 à 2 | Page pilier, 10 articles, 10 pages « trajet », FAQ | Moi (rédaction) + relecture médicale |
| Mois 2 à 4 | Lien de l'Institut, presse, profils, Wikidata | Vous |
| En continu | Suivi Search Console, Ahrefs, canal « Assistants IA », tests d'IA mensuels | Vous + moi |

## 5. À propos du « 10/10 »

Le 10/10 technique est atteignable en deux semaines. Le 10/10 de visibilité dépend du contenu et surtout des liens entrants : aucun réglage technique ne remplace une marque citée ailleurs. Avec 30 articles, une dizaine de pages « trajet » et quelques liens de qualité, un score global de 8,5 à 9 en six mois est réaliste pour un site neuf sur un sujet de santé.
