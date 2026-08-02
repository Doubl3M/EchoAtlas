# 06 · Architecture

> *Une architecture réussie ne se remarque pas.*
>
> *Elle permet simplement au Monde de grandir sans se contredire.*

---

# Objectif

L'architecture de Music Atlas poursuit un objectif simple :

séparer les responsabilités afin que chaque système puisse évoluer indépendamment.

Le projet ne doit jamais devenir un ensemble de dépendances circulaires.

Chaque module possède une mission clairement définie.

Chaque module ignore ce qui ne le concerne pas.

---

# Les couches du système

Music Atlas est organisé en couches successives.

```
                   User Interface
────────────────────────────────────────────

                    Renderer

────────────────────────────────────────────

                 World Engine

────────────────────────────────────────────

              Interpretation Engine

────────────────────────────────────────────

              Knowledge Graph

────────────────────────────────────────────

                Data Providers
```

Une couche ne dépend que de celle située immédiatement en dessous.

Jamais l'inverse.

---

# Les grands modules

Le projet est organisé autour de plusieurs domaines fonctionnels.

```
src/

core/
camera/
data/
events/
graph/
interaction/
render/
simulation/
ui/
utils/
world/
```

Chaque dossier possède une responsabilité unique.

---

# core

Le cœur du projet.

Il contient les types fondamentaux.

Les interfaces communes.

Les objets métier.

Les constantes.

Aucun code métier spécifique ne doit apparaître ailleurs s'il peut être partagé ici.

Le dossier `core` dépend de personne.

Tout le monde dépend de lui.

---

# data

Le point d'entrée des données.

Responsabilités :

- lecture des fichiers JSON ;
- validation ;
- normalisation ;
- migrations de version ;
- import futur depuis Spotify, Discogs, Last.fm ou d'autres sources.

Le dossier `data` ne construit jamais le Monde.

Il prépare uniquement les informations.

---

# graph

Le Knowledge Graph.

Il représente les relations.

Artistes.

Albums.

Labels.

Périodes.

Collaborations.

Playlists.

Influences.

Ce graphe constitue la mémoire du moteur.

La carte n'est qu'une conséquence de son existence.

---

# world

Le cœur géographique.

Il transforme les relations en territoire.

Il décide :

- où apparaissent les villes ;
- où naissent les montagnes ;
- comment évoluent les continents ;
- comment les routes se forment.

Il ignore totalement le rendu graphique.

---

# simulation

Le temps.

L'évolution.

L'érosion.

La croissance.

Les saisons éventuelles.

Les transformations progressives.

La simulation modifie le Monde.

Elle ne le recrée jamais entièrement.

---

# render

Le rendu.

Canvas aujourd'hui.

Peut-être WebGL demain.

Peut-être autre chose plus tard.

Le renderer ne connaît qu'une seule chose :

un Monde déjà construit.

Il ne prend jamais de décision métier.

---

# camera

Navigation.

Zoom.

Déplacement.

Inertie.

Mini-carte.

Suivi automatique.

La caméra n'a aucune connaissance musicale.

Elle ne fait qu'observer.

---

# interaction

Tout ce qui relie l'utilisateur au Monde.

Sélection.

Survol.

Recherche.

Navigation.

Infobulles.

Menus contextuels.

L'interaction manipule le Monde.

Elle ne le transforme pas.

---

# ui

L'interface.

Fenêtres.

Panneaux.

Filtres.

Préférences.

Chronologie.

Recherche.

La UI ne contient aucune logique de génération.

---

# events

Le système nerveux.

Toutes les communications passent par lui.

Exemples :

```
AlbumDiscovered

↓

WorldUpdated

↓

RendererInvalidated

↓

UIRefreshed
```

Les modules ne s'appellent jamais directement lorsqu'un événement suffit.

Cette règle réduit fortement le couplage.

---

# utils

Fonctions génériques.

Mathématiques.

Géométrie.

Random déterministe.

Parsing.

Outils divers.

Aucune logique métier.

---

# Dépendances

Les dépendances suivent toujours la même direction.

```
UI

↓

Interaction

↓

World

↓

Graph

↓

Data

↓

Core
```

Le renderer est un cas particulier.

Il observe le Monde.

Il ne le modifie jamais.

---

# Le cycle de vie

Le fonctionnement global du projet suit toujours le même ordre.

```
Import

↓

Validation

↓

Normalisation

↓

Construction du graphe

↓

Interprétation

↓

Construction du Monde

↓

Simulation

↓

Rendu

↓

Interaction

↓

Évolution

↓

Rendu
```

Le moteur ne saute jamais d'étape.

---

# Les objets du Monde

Le moteur manipule un nombre limité d'entités.

```
World

Continent

Province

City

Building

Mountain

Volcano

Forest

River

Road

Bridge

Port

Marsh

Desert

Ruin

Crossroad
```

Toutes héritent d'une même philosophie.

Elles représentent une histoire.

Jamais une simple géométrie.

---

# Les extensions

Toute nouvelle fonctionnalité doit répondre à une question.

Est-elle :

• une donnée ?

• une relation ?

• une interprétation ?

• une évolution ?

• un rendu ?

Si la réponse est ambiguë,

la fonctionnalité est probablement mal conçue.

---

# La stabilité

Une architecture durable accepte facilement :

- de nouveaux paysages ;
- de nouvelles sources de données ;
- de nouvelles représentations ;
- de nouveaux moteurs graphiques.

Sans remettre en cause les couches existantes.

---

# Le rôle de l'Atlas

L'Atlas décrit le Monde.

Le code le construit.

L'architecture fait le lien entre les deux.

Chaque module doit pouvoir être relié à un chapitre de l'Atlas.

Si ce lien disparaît,

l'architecture commence à dériver.

---

# Conclusion

Une bonne architecture ne cherche pas à être impressionnante.

Elle cherche à rendre les évolutions évidentes.

Dans Music Atlas, chaque nouvelle ligne de code doit trouver naturellement sa place.

Comme une nouvelle pierre dans une cité déjà ancienne.

---

> *L'architecture n'est pas une contrainte.*

> *Elle est la promesse que le Monde pourra continuer de grandir.*