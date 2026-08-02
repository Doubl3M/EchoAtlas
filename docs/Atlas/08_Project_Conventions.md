# 08 · Project Conventions

> *La cohérence n'est pas une conséquence du talent.*
>
> *Elle est le résultat de conventions respectées.*

---

# Objectif

Ce document définit les conventions utilisées dans Music Atlas.

Elles garantissent que le projet reste homogène, lisible et maintenable, quel que soit le nombre de contributeurs.

Ces conventions ne cherchent pas à limiter les développeurs.

Elles cherchent à éviter les ambiguïtés.

---

# La règle d'or

Une même idée doit toujours être exprimée de la même manière.

Si deux solutions existent, une seule devient la convention officielle.

---

# Langue du projet

Le projet utilise deux langues.

## Anglais

L'anglais est utilisé pour :

- le code source ;
- les classes ;
- les interfaces ;
- les types ;
- les variables publiques ;
- les API ;
- les messages de commit ;
- les branches Git.

Exemples :

```text
World
Province
Renderer
CameraController
KnowledgeGraph
```

---

## Français

Le français est utilisé pour :

- la documentation de conception ;
- les explications ;
- les exemples ;
- les discussions fonctionnelles.

L'Atlas pourra être traduit ultérieurement.

La langue de référence reste le français.

---

# Structure du dépôt

```
EchoAtlas/

assets/
docs/
examples/
scripts/
src/
tests/
tools/

package.json
README.md
CHANGELOG.md
LICENSE
```

Chaque dossier possède une responsabilité unique.

---

# Organisation du code

```
src/

camera/
core/
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

Les dépendances suivent toujours l'architecture décrite dans `06_Architecture.md`.

---

# Organisation des fichiers

Un fichier = une responsabilité.

Préférer :

```
Mountain.ts
```

à :

```
WorldObjects.ts
```

Les fichiers dépassant plusieurs centaines de lignes doivent être remis en question.

---

# Nommage

## Classes

PascalCase.

```
World

Mountain

KnowledgeGraph

Renderer
```

---

## Interfaces

Préfixe `I` interdit.

Préférer :

```
Renderer

Camera

GraphNode
```

à

```
IRenderer

ICamera
```

Le langage moderne permet de distinguer naturellement interfaces et implémentations.

---

## Fonctions

camelCase.

Les fonctions utilisent toujours un verbe.

```
generateWorld()

buildGraph()

findCity()

updateMountain()
```

---

## Variables

camelCase.

Le nom doit exprimer le rôle.

Éviter :

```
data

tmp

item

object
```

Préférer :

```
artistNode

albumCount

highestMountain

activeProvince
```

---

## Constantes

UPPER_SNAKE_CASE.

```
MAX_ZOOM

DEFAULT_SEED

WORLD_SCALE
```

---

# Dossiers

Les noms sont toujours :

- singuliers ;
- minuscules ;
- explicites.

Préférer :

```
camera
```

à

```
cameras
```

---

# Imports

Toujours classés dans cet ordre.

1. Bibliothèques externes

2. Core

3. Modules internes

4. Imports locaux

Chaque groupe est séparé par une ligne vide.

---

# Formatage

Le projet adopte :

- Prettier
- ESLint

Aucun style personnel.

Le formateur fait autorité.

---

# Commentaires

Le commentaire explique une intention.

Jamais le fonctionnement évident.

Mauvais :

```javascript
// Increment x

x++;
```

Bon :

```javascript
// Mountains grow progressively to preserve visual continuity.
```

---

# TODO

Les TODO doivent toujours être qualifiés.

```
TODO(engine):

TODO(renderer):

TODO(camera):
```

Un TODO sans contexte est interdit.

---

# Git

## Branches

```
main

develop

feature/...

fix/...

refactor/...

docs/...
```

---

## Commits

Format recommandé :

```
type(scope): description
```

Exemples :

```
feat(world): generate mountain ranges

fix(camera): clamp zoom level

docs(atlas): add rendering pipeline
```

---

# Documentation

Toute nouvelle fonctionnalité importante doit être accompagnée :

- d'une documentation ;
- d'un exemple ;
- si nécessaire, d'un schéma ASCII.

Le code n'est jamais la seule documentation.

---

# Dépendances

Toute nouvelle dépendance externe doit répondre aux critères suivants.

- réellement utile ;
- maintenue ;
- documentée ;
- légère ;
- compatible avec la philosophie du projet.

Les dépendances de confort sont à éviter.

---

# Gestion des erreurs

Le moteur ne doit jamais masquer une erreur.

Préférer :

```
Impossible de construire le graphe :

albumId manquant.
```

à

```
Unexpected error.
```

Chaque message d'erreur doit aider à résoudre le problème.

---

# Tests

Toute fonctionnalité métier importante doit posséder au minimum :

- un test nominal ;
- un test limite ;
- un test d'échec.

Les tests sont considérés comme du code de production.

---

# Schémas

Les diagrammes utilisent autant que possible :

- Markdown
- ASCII
- Mermaid (si adopté ultérieurement)

Ils doivent rester lisibles directement sur GitHub.

---

# Compatibilité

Le projet privilégie :

- les standards ECMAScript ;
- les API Web standard ;
- les formats ouverts.

Les technologies propriétaires doivent rester optionnelles.

---

# Avant un merge

Chaque contribution doit vérifier :

- [ ] Le code compile.
- [ ] Les tests passent.
- [ ] Le formatage est appliqué.
- [ ] Les imports sont propres.
- [ ] Aucun code mort.
- [ ] Aucun `console.log`.
- [ ] Documentation mise à jour.
- [ ] Aucun avertissement ESLint.
- [ ] Les conventions sont respectées.

---

# Conclusion

Les conventions ne sont pas une contrainte.

Elles permettent au projet de rester cohérent malgré le temps.

Le lecteur ne doit jamais avoir à deviner comment le projet est organisé.

---

> *Lorsqu'un nouveau développeur ouvre EchoAtlas, il doit avoir l'impression que l'ensemble du code a été écrit par une seule personne.*