# 09 · Data Model

> *Le Monde est composé d'objets.*
>
> *Les objets racontent une histoire.*

---

# Objectif

Ce document définit le modèle métier officiel de Music Atlas.

Il décrit :

- les entités du Monde ;
- leurs responsabilités ;
- leurs relations ;
- leurs invariants.

Aucune implémentation n'est imposée.

Le moteur, le renderer et l'interface devront tous respecter ce modèle.

---

# Vue d'ensemble

Le Monde est organisé sous la forme d'un graphe d'objets.

```
World
│
├── Continents
│     ├── Provinces
│     │      ├── Cities
│     │      │      ├── Buildings
│     │      │      └── Connections
│     │      │
│     │      ├── Mountains
│     │      ├── Volcanoes
│     │      ├── Ruins
│     │      ├── Marshes
│     │      ├── Ports
│     │      ├── Forests
│     │      ├── Rivers
│     │      ├── Roads
│     │      ├── Bridges
│     │      └── Crossroads
│     │
│     └── Metadata
│
└── Global Metadata
```

Chaque objet possède un identifiant unique.

---

# Imported Music Document

L'import JSON produit une enveloppe documentaire immuable.

```text
ImportedMusicDocument
│
├── metadata
└── catalog: MusicCatalog
```

`metadata` décrit le document importé et conserve notamment sa version et sa seed éventuelle.

`MusicCatalog` contient uniquement le domaine musical structurel :

- artistes ;
- albums ;
- morceaux ;
- labels ;
- playlists ;
- relations musicales.

Les métadonnées du document ne deviennent ni des entités musicales, ni des nœuds du Knowledge
Graph.

Les événements d'écoute appartiendront au modèle de Listening History distinct requis pour la
navigation temporelle V1. Les paramètres applicatifs n'appartiennent pas au catalogue musical.

## Identités musicales

L'identité d'une entité musicale est formée de son kind et de son identifiant canonique.

```text
(kind, canonical ID)
```

Deux catégories peuvent donc employer le même identifiant sans collision.

Une playlist est une entité musicale identifiée et nommée. Son contenu est représenté uniquement
par des relations explicites.

Une collaboration est une relation musicale. Elle n'est pas une entité implicite.

Le format JSON V1 n'importe ni genre ni compilation. Ces concepts restent disponibles dans le
modèle Music pour de futures versions.

---

# World

Le World représente l'intégralité de l'Atlas.

## Responsabilités

- contenir tous les objets
- garantir leur cohérence
- gérer les métadonnées globales
- exposer une API de navigation

## Contient

- continents
- oceans
- metadata
- seed
- version

## Invariants

- un seul World existe
- tous les objets appartiennent à un World
- aucune référence orpheline

---

# Metadata

Les métadonnées décrivent l'Atlas.

Exemples :

```
nom

version

date de génération

seed

source des données

nombre d'albums

nombre d'artistes

temps de génération
```

Elles ne participent jamais au rendu.

---

# Continent

Le continent représente une grande famille musicale.

## Possède

- identifiant
- nom
- géométrie
- provinces
- surface
- couleur
- statistiques

## Relations

```
World

↓

Continent

↓

Province
```

## Invariants

Une province appartient toujours à un seul continent.

---

# Province

La province représente une famille d'influences.

Elle organise les villes.

## Possède

- nom
- frontière
- villes
- relief
- climat
- statistiques

---

# City

Une ville représente un artiste.

## Possède

- nom
- coordonnées
- population symbolique
- bâtiments
- importance
- connexions

## Relations

```
Province

↓

City

↓

Buildings
```

---

# Building

Le bâtiment représente un album.

Tous les albums sont des bâtiments.

Leur architecture dépend de leur importance.

## Attributs

- album
- année
- importance
- état
- taille
- position

---

# Mountain

Une montagne représente une œuvre fondatrice.

## Attributs

- altitude
- massif
- âge
- croissance
- prominence

Une montagne évolue.

Elle ne réapparaît jamais brutalement.

---

# Volcano

Le volcan représente un choc émotionnel récent.

## Attributs

- activité
- intensité
- date d'apparition
- stabilité

Le volcan peut devenir montagne.

---

# Port

Le port représente une découverte.

## Attributs

- activité
- trafic
- date
- connexions

Un port peut devenir une ville importante.

---

# Ruin

Une ruine représente un album oublié.

## Attributs

- niveau de dégradation
- ancienneté
- vestiges

Une ruine n'est jamais supprimée.

---

# Marsh

Le marais représente une exploration inachevée.

## Attributs

- progression
- stagnation
- humidité symbolique

---

# Desert

Le désert représente une zone silencieuse.

## Attributs

- surface
- durée
- potentiel de renaissance

---

# River

Une rivière représente une habitude.

## Possède

- source
- embouchure
- débit
- longueur

Elle relie plusieurs régions.

---

# Road

Une route représente un parcours volontaire.

Exemple :

une playlist.

## Attributs

- longueur
- fréquentation
- type

---

# Bridge

Le pont représente une collaboration.

Il relie deux régions.

Il n'existe jamais sans raison.

---

# Forest

La forêt représente la curiosité.

## Attributs

- densité
- croissance
- diversité

---

# Crossroad

Le carrefour représente un point de convergence.

Exemples :

- compilation
- bande originale
- album collaboratif

---

# Ocean

L'océan sépare les continents.

Il ne possède aucune donnée musicale directe.

Il structure le Monde.

---

# Coordinates

Tous les objets spatiaux possèdent :

```
x

y

z (optionnel)

rotation

scale
```

Le renderer décide ensuite de leur représentation.

---

# Geometry

La géométrie est indépendante des données musicales.

Elle décrit uniquement :

- la forme
- la taille
- les limites
- les collisions

---

# Statistics

Les statistiques enrichissent les objets.

Exemples :

```
nombre d'albums

nombre d'écoutes

ancienneté

popularité personnelle

indice de fidélité
```

Le moteur les utilise.

Le renderer peut les ignorer.

---

# Connections

Les connexions représentent les relations.

Exemples :

```
Artist

↓

Artist

Album

↓

Album

Province

↓

Province
```

Toutes les connexions sont orientées.

---

# Identifiants

Chaque objet possède un identifiant stable.

Exemple :

```
world-1

continent-4

city-19

album-284

mountain-8
```

Les identifiants ne changent jamais.

---

# Cycle de vie

Tous les objets suivent le même cycle.

```
Création

↓

Croissance

↓

Transformation

↓

Mémoire
```

Un objet n'est jamais supprimé brutalement.

---

# Relations

```
World

└── Continents

     └── Provinces

           └── Cities

                 └── Buildings
```

Les objets secondaires se connectent ensuite :

```
Road

River

Forest

Bridge

Mountain

Port

Ruin

Volcano
```

---

# Invariants globaux

Le moteur garantit toujours :

- aucun objet orphelin
- aucune boucle impossible
- aucune référence invalide
- identifiants uniques
- cohérence spatiale
- cohérence temporelle
- déterminisme

---

# Extension du modèle

Toute nouvelle entité doit répondre aux questions suivantes.

1. Représente-t-elle une donnée ?

2. Représente-t-elle une relation ?

3. Représente-t-elle une évolution ?

4. Possède-t-elle une signification cartographique ?

Si la réponse est non,

elle n'appartient probablement pas au modèle métier.

---

# Conclusion

Le modèle métier constitue le vocabulaire officiel du moteur.

Le code n'invente jamais de nouveaux concepts.

Il implémente ceux définis ici.

---

> *Le Monde n'est pas un ensemble de classes.*

> *Les classes ne sont que la traduction informatique du Monde.*
