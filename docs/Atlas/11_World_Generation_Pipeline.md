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

Exemple :

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

Exemples :

```
Fidélité élevée

↓

Mountain

Découverte récente

↓

Port

Album interrompu

↓

Marsh

Album oublié

↓

Ruin
```

Le résultat est un ensemble de **concepts géographiques**, pas encore des objets spatiaux.

---

# Étape 6 · World Skeleton

Le moteur crée l'ossature du Monde.

Ordre recommandé :

1. Océans
2. Continents
3. Provinces
4. Relief général
5. Fleuves principaux

Le paysage existe.

Il est encore inhabité.

---

# Étape 7 · Settlement

Le Monde accueille ses habitants.

Ordre recommandé :

1. Villes
2. Bâtiments
3. Ports
4. Montagnes
5. Volcans
6. Ruines
7. Marais
8. Déserts
9. Forêts

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
+ règles temporelles
+ version de l'algorithme de génération
→ World(T)
```

`T` ne provient jamais de l'heure système, d'un « maintenant » implicite ou du chemin de navigation
de l'utilisateur. Ouvrir directement `T` ou revenir à `T` plus tard produit le même snapshot.

Cette reconstruction ne consiste pas à masquer les éléments postérieurs à `T`. Une ruine actuelle
peut être un lieu actif dans un snapshot antérieur ; une route aujourd'hui disparue peut y
réapparaître. Les règles détaillées correspondantes ne sont pas encore implémentées.

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
Mountain created

City expanded

Road connected

Province merged

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
