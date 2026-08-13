# 11 · World Generation Pipeline

> *Le Monde n'apparaît pas d'un seul geste.*
>
> *Il se construit par transformations successives.*

---

# Objectif

Le World Generation Pipeline décrit l'ensemble des étapes permettant de transformer un jeu de données musicales en un atlas interactif.

Chaque étape possède une responsabilité unique.

Aucune étape ne doit effectuer le travail d'une autre.

Le pipeline est :

- déterministe ;
- reproductible ;
- modulaire ;
- extensible.

L'étendue logique du World et la résolution de sa grille Terrain sont deux entrées explicites et
indépendantes. Le World associe déterministement ses coordonnées aux cellules Terrain ; le Terrain
reste une grille numérique générique et le Renderer ne décide jamais de l'altitude d'un lieu.
Une grille Terrain plus fine que le World reste valide : toutes ses cellules couvrent l'étendue
visuelle continue, même si le domaine historique des WorldLocations `[0, dimension - 1]` ne permet
pas nécessairement à une localisation d'échantillonner les cellules voisines de la borne visuelle.

---

# Vue d'ensemble

Le pipeline suit toujours le même ordre.

```
JSON

↓

Validation

↓

Normalization

↓

Knowledge Graph

↓

Analysis

↓

Interpretation

↓

World Generation

↓

Simulation

↓

Rendering Model

↓

Renderer
```

Chaque étape produit un nouvel état.

Une étape ne modifie jamais directement la précédente.

---

# Étape 1 · Validation

Objectif :

Garantir que les données sont exploitables.

Contrôles :

- format JSON valide ;
- version compatible ;
- identifiants uniques ;
- références cohérentes ;
- types corrects ;
- champs obligatoires présents.

Sortie :

```
Validated Dataset
```

---

# Étape 2 · Normalization

Les données provenant de différentes plateformes sont harmonisées.

Exemple futur, une fois les règles correspondantes définies :

```
Spotify

↓

Album

Discogs

↓

Album

Local JSON

↓

Album
```

Après cette étape, le moteur ne connaît plus l'origine des données.

Toutes possèdent le même modèle.

Sortie :

```
Normalized Dataset
```

---

# Étape 3 · Knowledge Graph

Le moteur construit ensuite le graphe musical.

Les nœuds représentent :

- artistes ;
- albums ;
- morceaux ;
- labels ;
- playlists.

Les liens représentent :

- collaborations ;
- réécoutes ;
- appartenances ;
- influences ;
- chronologie.

Sortie :

```
Knowledge Graph
```

Cette structure devient la mémoire du projet.

---

# Étape 4 · Analysis

Le moteur calcule les indicateurs nécessaires à l'interprétation.

Exemples :

- fidélité ;
- fréquence ;
- ancienneté ;
- durée moyenne d'écoute ;
- cycles de retour ;
- vitesse de découverte ;
- densité des relations.

À ce stade, aucune géographie n'existe encore.

---

# Étape 5 · Interpretation

Le moteur applique le langage cartographique.

Contrat structurel canonique :

```
Genre  → Continent
Artist → District
Album  → Building
Track  → Building Content
```

City reste un niveau spatial prévu dont la règle de génération n'est pas résolue. Elle n'est pas
instanciée implicitement. Les anciennes traductions Mountain, Port, Marsh ou Ruin sont legacy et
devront être réinterprétées comme états ou aspects éventuels sans remplacer les identités
structurelles.

Le résultat est un ensemble de **concepts géographiques**, pas encore des objets spatiaux. Les
relations musicales restent dans Knowledge; la politique Music Atlas qui les interprète appartient
à l'application, tandis que le containment générique résultant appartient au World.

Pour Music Atlas, la couche application applique explicitement `music-geography-v1`. Les relations
sont dirigées : Genre → Artist crée le District, Artist → Album propage le Building dans chaque
District représenté, puis Album → Track propage le Building Content. Les relations inverses ou
d'autres couples de kinds sont ignorés et aucun parent géographique de repli n'est inventé.
Cette version d'interprétation est distincte de `metadata.version`, de la version des règles
temporelles et de `WorldConfig.generationVersion`.

---

# Étape 6 · World Skeleton

Le moteur crée l'ossature du Monde.

Ordre recommandé :

1. Océans
2. Continents
3. Districts, directement sous leur Continent tant que City reste non résolue
4. Relief général

Le paysage existe.

Il est encore inhabité.

---

# Étape 7 · Settlement

Le Monde accueille ses habitants.

Ordre recommandé :

1. Districts
2. Buildings
3. Building Contents

Les futurs états et aspects cartographiques sont appliqués seulement lorsqu'un contrat distinct
les définit.

Chaque élément est positionné selon les contraintes géographiques.

---

# Étape 8 · Connections

Le moteur relie ensuite les éléments.

Création :

- routes ;
- chemins ;
- ponts ;
- carrefours.

Les connexions suivent toujours la topologie existante.

Le moteur évite les incohérences visuelles.

---

# Étape 9 · Simulation

Le Monde devient vivant.

Le moteur applique :

- croissance ;
- érosion ;
- vieillissement ;
- expansion ;
- renaissance.

Les règles temporelles interprètent le Listening History jusqu'à un instant explicite `T`.

Pour un même `T` et les mêmes entrées, le snapshot reste exactement reproductible. Entre deux
instants distincts, aucune continuité stricte des coordonnées ou du layout n'est imposée : le Monde
peut changer si l'histoire musicale et les règles temporelles le demandent.

---

# Étape 10 · Optimization

Le moteur prépare le rendu.

Exemples :

- simplification des polygones ;
- spatial index ;
- quadtrees ;
- cache géométrique ;
- regroupements.

Cette étape ne modifie jamais le sens du Monde.

Elle améliore uniquement les performances.

---

# Étape 11 · Rendering Model

Le moteur construit une représentation adaptée au renderer.

Exemple :

```
World

↓

Render Layers

↓

Sprites

↓

Geometry

↓

Camera
```

Le renderer ne connaît jamais les données musicales.

Il ne manipule que des objets graphiques.

---

# Les dépendances

Chaque étape dépend uniquement de la précédente.

```
Validation

↓

Normalization

↓

Knowledge Graph

↓

Analysis

↓

Interpretation

↓

Generation

↓

Simulation

↓

Rendering
```

Aucun retour arrière.

Aucune dépendance circulaire.

---

# Reconstruction temporelle

La navigation temporelle reconstruit un snapshot historique complet :

```
MusicCatalog
+ ListeningHistory jusqu'à T
+ seed
+ version des règles temporelles
+ WorldConfig
→ World(T)
```

`T` ne provient jamais de l'heure système, d'un « maintenant » implicite ou du chemin de navigation
de l'utilisateur. Ouvrir directement `T` ou revenir à `T` plus tard produit le même snapshot.

`WorldConfig` contient notamment `WorldGenerationVersion`, les dimensions logiques, `TerrainConfig`
et les paramètres explicites de placement actuels. Sa version actuelle `world-v1-exact` désigne la
physique de placement exacte observable, sans figer ses structures internes. Cette
`WorldConfig.generationVersion` ne doit pas être confondue avec `metadata.version`, qui décrit le
format du JSON importé. Un futur format de projet devra conserver cette configuration pour permettre
la reconstruction historique ; aucune persistance n'est introduite ici.

Cette reconstruction ne consiste pas à masquer les éléments postérieurs à `T`. Une ruine actuelle
peut être un lieu actif dans un snapshot antérieur ; une route aujourd'hui disparue peut y
réapparaître. Les règles détaillées correspondantes ne sont pas encore implémentées.

La hiérarchie géographique fait partie du snapshot reconstruit. Elle dépend uniquement des entrées
canoniques et de leurs versions, jamais de l'heure système, d'un historique mutable ou du snapshot
précédent. À entrées identiques, son ordre, ses identités et son containment sont identiques.

---

# Pipeline complet

Le pipeline complet est notamment utilisé :

- au premier lancement ;
- à une nouvelle seed ;
- à un changement majeur de version ;
- à une reconstruction volontaire.

Une future mise à jour locale reste une optimisation possible. Elle doit produire le même
`World(T)` que la reconstruction complète pour les mêmes entrées et ne devient jamais une source de
vérité dépendante du chemin suivi.

---

# Journal des transformations

Chaque étape peut produire un journal.

Exemple :

```
Continent created

District expanded

Road connected

Building state changed

Forest grew
```

Ce journal facilite :

- le débogage ;
- les tests ;
- les animations ;
- les futures fonctionnalités de replay.

---

# Gestion des erreurs

Une erreur bloque uniquement l'étape concernée.

Le pipeline doit produire un diagnostic précis.

Exemple :

```
Validation

✓

Normalization

✓

Knowledge Graph

✗

Album "album-421"

Artist reference missing
```

L'utilisateur doit toujours comprendre l'origine du problème.

---

# Extensibilité

Une nouvelle étape peut être ajoutée.

À condition :

- qu'elle possède une responsabilité unique ;
- qu'elle respecte le déterminisme ;
- qu'elle ne casse pas les contrats existants.

---

# Conclusion

Le pipeline est le cœur opérationnel de Music Atlas.

Il transforme une bibliothèque musicale en un monde cohérent.

Chaque étape ajoute du sens.

Jamais de la complexité inutile.

---

> *Le Monde n'apparaît pas lorsqu'il est dessiné.*

> *Il apparaît lorsque toutes les transformations ont trouvé leur place.*
