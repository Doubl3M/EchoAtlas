# 12 · Rendering Pipeline

> *Le moteur construit le Monde.*
>
> *Le renderer le rend visible.*

---

# Objectif

Le Rendering Pipeline décrit comment le World est transformé en une carte interactive.

Son rôle est exclusivement graphique.

Il ne prend aucune décision métier.

Toutes les décisions concernant la musique, les paysages ou leur évolution appartiennent au World Engine.

---

# Philosophie

Le renderer est un observateur.

Il reçoit un Monde déjà construit.

Il l'affiche.

Il permet de l'explorer.

Il ne le modifie jamais.

Cette séparation garantit que le rendu pourra évoluer sans remettre en cause les règles du Monde.

---

# Vue d'ensemble

```
World

↓

Scene Builder

↓

Render Layers

↓

Camera

↓

Viewport

↓

Canvas

↓

Screen
```

Chaque étape possède une responsabilité unique.

---

# Les composants

Le Rendering Pipeline est composé de plusieurs systèmes.

```
World

↓

Scene Builder

↓

Layer Manager

↓

Camera

↓

Renderer

↓

Interaction

↓

UI Overlay
```

Le World reste indépendant de chacun d'eux.

---

# Scene Builder

Le Scene Builder transforme les objets métier en objets graphiques.

Exemple :

```
Mountain

↓

Polygon + Label

↓

Render Object
```

Ou encore :

```
City

↓

Sprite + Label

↓

Render Object
```

Les Render Objects ne possèdent plus aucune logique musicale.

Ils ne sont que des éléments visuels.

---

# Layer Manager

Le rendu est organisé en couches.

Ordre recommandé :

```
Sky

Ocean

Continents

Provinces

Relief

Forests

Rivers

Roads

Bridges

Cities

Buildings

Mountains

Volcanoes

Ruins

Labels

Selection

UI
```

Chaque couche peut être activée ou désactivée indépendamment.

---

# Camera

La caméra est le point de vue du voyageur.

Elle gère :

- le zoom ;
- le déplacement ;
- l'inertie ;
- les limites du Monde ;
- le recentrage.

La caméra ne connaît jamais les objets musicaux.

---

# Coordonnées

Le renderer manipule trois espaces.

```
World Space

↓

Camera Space

↓

Screen Space
```

Toutes les interactions passent par ces conversions.

---

# Zoom

Le zoom est continu.

Il ne provoque jamais de rupture visuelle.

Le niveau de zoom influence :

- la taille des labels ;
- les détails visibles ;
- les animations ;
- le niveau de simplification.

---

# Level of Detail (LOD)

Tous les objets ne sont pas visibles en permanence.

Le niveau de détail dépend du zoom.

Exemple :

```
Zoom faible

↓

Continents
Provinces
Capitales

----------------

Zoom moyen

↓

Villes
Montagnes
Routes

----------------

Zoom fort

↓

Albums
Bâtiments
Ponts
Ruines
Ports
```

Le Monde révèle progressivement ses détails.

---

# Culling

Les objets invisibles ne sont pas dessinés.

Le renderer calcule uniquement les éléments présents dans le viewport.

Cette optimisation est obligatoire.

---

# Spatial Index

Le renderer utilise un index spatial.

Exemples possibles :

```
Quadtree

RTree

Grid
```

Son objectif :

retrouver rapidement les objets visibles.

---

# Picking

Le picking permet de sélectionner un objet.

Étapes :

```
Mouse

↓

Screen Position

↓

World Position

↓

Spatial Index

↓

Selected Object
```

Le renderer ne décide jamais de la réaction.

Il identifie uniquement l'objet.

---

# Sélection

Un objet sélectionné possède un état graphique particulier.

Exemples :

- contour ;
- halo ;
- légère animation ;
- changement d'échelle.

La sélection ne modifie jamais les données.

---

# Navigation

Le déplacement respecte plusieurs principes.

- inertie légère ;
- arrêt progressif ;
- limites du Monde ;
- recentrage fluide.

L'utilisateur doit avoir l'impression de voyager.

Jamais de déplacer une image.

---

# Animations

Les animations renforcent la compréhension.

Exemples :

- apparition d'une ville ;
- croissance d'une montagne ;
- ouverture d'un port ;
- expansion d'une forêt.

Les animations décoratives sont à éviter.

---

# Labels

Les labels apparaissent progressivement.

Ils respectent plusieurs règles.

- pas de chevauchement ;
- priorité aux objets importants ;
- disparition progressive ;
- orientation lisible.

Le texte reste un complément.

Jamais un obstacle.

---

# Boucle de rendu

Le renderer fonctionne selon une boucle simple.

```
Input

↓

Camera Update

↓

Visibility

↓

LOD

↓

Layers

↓

Draw

↓

Overlay
```

Chaque image suit exactement cette séquence.

---

# Dirty Rendering

Le renderer évite les redessins inutiles.

Le rendu est relancé uniquement lorsqu'un événement l'exige.

Exemples :

- déplacement caméra ;
- zoom ;
- évolution du Monde ;
- sélection.

Une carte immobile ne doit pas consommer inutilement des ressources.

---

# Double Buffer

Le renderer prépare l'image suivante avant son affichage.

Cette approche limite :

- le scintillement ;
- les artefacts ;
- les ruptures visuelles.

---

# Événements

Le renderer écoute plusieurs événements.

```
WorldChanged

↓

CameraMoved

↓

ZoomChanged

↓

SelectionChanged

↓

ThemeChanged
```

Il ne crée jamais ces événements.

---

# Interaction

Les interactions sont indépendantes du rendu.

Exemples :

```
Hover

Click

Double Click

Drag

Wheel

Keyboard
```

Chaque interaction est traduite en événement.

---

# Performance

Objectifs :

- navigation fluide ;
- zoom instantané ;
- sélection réactive ;
- faible consommation mémoire.

La stabilité est prioritaire sur la richesse graphique.

---

# Futurs renderers

Le moteur doit permettre plusieurs implémentations.

Exemples :

- HTML5 Canvas
- WebGL
- SVG
- Export PNG
- Export PDF
- Impression

Tous utilisent le même World.

---

# Responsabilités

Le renderer :

✔ dessine.

✔ anime.

✔ sélectionne.

✔ affiche.

Le renderer ne :

✘ génère pas le Monde.

✘ n'interprète pas les données musicales.

✘ ne modifie pas les objets métier.

✘ ne décide pas de la géographie.

---

# Conclusion

Le Rendering Pipeline est la dernière étape de Music Atlas.

Il ne crée rien.

Il révèle simplement un Monde déjà construit.

Sa mission n'est pas d'impressionner.

Sa mission est de rendre l'exploration naturelle.

---

> *Le moteur raconte une histoire.*

> *Le renderer la rend visible.*

> *Le voyageur lui donne un sens.*