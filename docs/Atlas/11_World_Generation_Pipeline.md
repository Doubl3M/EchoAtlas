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

Aucun objet n'apparaît brutalement.

Chaque évolution possède une continuité.

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

# Pipeline incrémental

Lorsqu'une nouvelle écoute apparaît, le pipeline complet n'est pas relancé.

Le moteur détermine les étapes concernées.

Exemple :

```
Nouvelle écoute

↓

Graph

↓

Analysis

↓

Interpretation

↓

Simulation

↓

Renderer
```

Les continents ne sont pas recalculés inutilement.

---

# Pipeline complet

Le pipeline complet est réservé :

- au premier lancement ;
- à une nouvelle seed ;
- à un changement majeur de version ;
- à une reconstruction volontaire.

Le reste du temps, le moteur privilégie une mise à jour locale.

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