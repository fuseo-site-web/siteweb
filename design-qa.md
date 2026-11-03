# Design QA — page Tarifs Fuseo

- Source visual truth: capture jointe au dernier message utilisateur (522 × 339 px ; pas de chemin local fourni).
- Implementation screenshot: capture du navigateur Chrome, onglet `http://localhost:3000/tarifs` (capture CUA du 3 novembre 2026 ; pas de fichier local exporté).
- Viewports: bureau 2390 × 1101 px, densité 1 ; mobile 390 × 844 px, densité 1.
- State: page française, thème clair, bandeau cookies fermé. La référence est un recadrage du haut de la page ; la comparaison porte sur les proportions et la hiérarchie de cette zone.

## Comparaison visuelle

- Typographie : police Montserrat du site conservée ; titre sur deux lignes, prix et noms d'offres bien hiérarchisés.
- Mise en page : trois cartes alignées sur bureau, carte « Un voyage » soulignée en bleu, espacement et largeur resserrés ; cartes empilées sans débordement sur mobile.
- Couleurs : bleu nuit, cyan et ambre cohérents avec la référence et les tokens Fuseo.
- Images : nouveau voyageur en aéroport dans l'en-tête ; passeport, aile d'avion et Terre vue de l'espace dans les trois offres. Les trois images des cartes sont en WebP et possèdent un texte alternatif dans chaque langue.
- Contenu : offres, montants, bénéfices et appels à l'action conservés ; le bouton central mène au formulaire de plan.

## Historique des corrections

- État initial : l'en-tête ne montrait pas de voyageur et les trois cartes réutilisaient des images génériques ; les cartes occupaient presque toute la largeur d'un grand écran.
- Correction : quatre visuels dédiés, mise en page limitée à 1440 px, contraste de la carte centrale renforcé et images intégrées dans les cartes.
- Vérification finale : captures bureau et mobile examinées, pas de débordement horizontal à 390 px ; les versions française, anglaise et espagnole affichent les bons titres et textes alternatifs. La compilation de production, TypeScript, ESLint et Prettier passent.

**final result: passed**
