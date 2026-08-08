# 13 · Glossary

> Vocabulaire canonique d'EchoAtlas

---

# Produit et architecture

## EchoAtlas

Projet général et moteur déterministe capable de transformer des structures sémantiques en mondes
géographiques explorables. EchoAtlas reste indépendant de tout domaine particulier.

## Music Atlas

Première interprétation spécialisée d'EchoAtlas. Music Atlas transforme des données musicales en
structures sémantiques avant leur traduction géographique.

## Engine

Ensemble des mécanismes génériques de `src/engine/` : cycle de vie, mathématiques, terrain, caméra
et, à terme, interaction. L'Engine ne connaît ni la musique ni la géographie métier.

## Application

Couche `app` qui crée les dépendances, orchestre leur cycle de vie et coordonne le démarrage et
l'arrêt. Elle ne génère pas le terrain, n'interprète pas la musique et ne dessine pas.

## Music Domain

Couche spécialisée `music` qui comprend artistes, albums, morceaux, labels, playlists et relations
musicales. Elle ne contient aucune géographie.

## Semantic World

Représentation du sens sous forme de concepts et de relations. Dans l'implémentation actuelle,
elle est portée par le Knowledge Graph.

## Geographic World

Représentation spatiale produite par `world` à partir du Knowledge Graph. Elle contient des
coordonnées, des altitudes et des connexions, sans apparence graphique.

## Rendered World

Représentation visuelle d'un Geographic World. Elle dépend du Renderer et du thème, mais ne change
jamais la géographie.

---

# Import et domaine musical

## MusicEntity

Concept musical immutable identifié par un kind et un Canonical ID. Les kinds actuels sont
`artist`, `album`, `track`, `label`, `genre`, `playlist` et `compilation`.

## MusicCatalog

Snapshot immutable d'entités et de relations musicales structurées. Il ne contient ni metadata
d'import, ni historique d'écoute, ni configuration applicative.

## MusicInterpreter

Transformation déterministe d'un `MusicCatalog` en `KnowledgeGraph`. Il applique les namespaces
musicaux aux IDs et aux kinds sans produire de géographie.

## ImportedMusicDocument

Résultat immutable du JSON Import V1. Il contient la metadata documentaire validée et un
`MusicCatalog` séparé.

## ImportedMusicMetadata

Enveloppe documentaire immutable comprenant `version`, puis éventuellement `title`, `owner`,
`generatedAt`, `seed` et `locale`. Elle n'entre pas dans le Knowledge Graph.

## JSON V1

Format d'import musical strict de version `"1.0"`. Il définit sept propriétés racines obligatoires
et refuse les champs inconnus, les références implicites et les versions non supportées.

## MusicJsonImporter

Frontière qui parse ou valide une valeur externe et construit un `ImportedMusicDocument`. Il ne
construit ni Knowledge Graph ni World.

## MusicJsonImportError

Erreur d'import stable indiquant une catégorie `syntax` ou `validation`, un chemin JSON et une
raison indépendante de l'interface utilisateur.

## Listening History

Historique temporel distinct de `MusicCatalog`, composé conceptuellement de Listening Events. Il
décrit l'histoire musicale de l'utilisateur et alimente la Temporal Navigation. Sa reconstruction
reste déterministe à partir d'entrées explicites, sans notion implicite de « maintenant ».

## Listening Event

Événement explicite appartenant au Listening History et représentant un fait d'écoute dans le
temps. Il ne devient ni une propriété structurelle de `MusicCatalog`, ni un événement analytics de
navigation.

## Temporal Navigation

Exploration de l'évolution de l'atlas musical à partir du Listening History. Elle est critique
pour Version 1.0 et reste distincte du temps d'exécution, du framerate et du parcours de
l'utilisateur dans l'interface.

## User Journey Analytics

Analyse future de la manière dont l'utilisateur parcourt EchoAtlas, fondée à terme sur des
événements sémantiques tels qu'un focus d'entité ou le suivi d'une relation. Elle ne décrit pas les
écoutes musicales et reste hors du périmètre V1 obligatoire actuel.

---

# Knowledge

## Knowledge Graph

Snapshot sémantique générique composé de `KnowledgeNode` et de `KnowledgeRelation`. Il contient du
sens et des poids, jamais de coordonnées ou d'apparence.

## KnowledgeNode

Concept sémantique immutable possédant un Node ID, un kind et un poids fini.

## KnowledgeRelation

Relation sémantique immutable, dirigée et explicitement identifiée entre deux Knowledge Nodes.

## Node ID

Identité stable et unique d'un Knowledge Node dans un Knowledge Graph. Elle ne dépend jamais de sa
position géographique.

## Relation ID

Identité stable et unique d'une relation dans son graphe ou son document source. Plusieurs
relations entre les mêmes extrémités restent distinctes grâce à cet ID.

## Canonical ID

Identifiant stable fourni par le domaine source et conservé exactement lorsqu'il est valide. Dans
Music, l'identité complète associe le kind au Canonical ID.

## Weight

Nombre fini porté par une entité ou une relation sémantique. Le poids neutre utilisé en l'absence
de valeur musicale explicite est `1`; aucune normalisation arbitraire n'est appliquée.

---

# World et terrain

## World

Couche qui décide de la géographie. Elle traduit un Knowledge Graph en représentation spatiale en
utilisant les mécanismes génériques de l'Engine.

## World Engine

Ensemble des responsabilités de génération situées dans `src/world/`. Il ne lit jamais les données
musicales directement.

## GeographicWorld

Snapshot géographique immutable contenant un `HeightField`, des `WorldLocation` et des
`WorldConnection` indexés par leurs identités sémantiques.

## WorldLocation

Localisation immutable correspondant à un Knowledge Node. Elle conserve son ID canonique et lui
associe des coordonnées et une altitude.

## WorldConnection

Connexion géographique immutable correspondant à une Knowledge Relation. Elle conserve la
direction et les IDs sémantiques; elle n'est pas encore une route visuelle.

## Terrain Engine

Module générique `engine/terrain` qui produit un champ numérique d'altitudes déterministe. Il ne
connaît ni continent, ni biome, ni style visuel.

## HeightField

Grille rectangulaire immutable d'altitudes normalisées dans `[0, 1]`, stockées de façon contiguë.

## Seed

Valeur numérique ou textuelle convertie de manière stable en `uint32` pour initialiser les
algorithmes procéduraux déterministes.

## Determinism

Garantie que des entrées identiques produisent exactement le même résultat observable,
indépendamment du temps, de la locale, du framerate et de l'ordre d'entrée non sémantique.

## DeterministicRandom

Générateur pseudo-aléatoire reproductible fondé sur une Seed et sans état global.

## ValueNoise2D

Bruit de valeur bidimensionnel déterministe, continu et normalisé dans `[0, 1]`.

---

# Caméra et rendu

## Camera2D

Caméra stateful et indépendante du navigateur qui transforme les coordonnées monde en coordonnées
écran et inversement. Elle gère position, zoom et viewport sans modifier le World.

## Viewport

Rectangle abstrait visible par la caméra, défini par une largeur et une hauteur finies. Ses
dimensions sont indépendantes du backing store d'un Canvas.

## World coordinates

Coordonnées dans l'espace du Geographic World. Les axes actuels suivent `+x` vers la droite et
`+y` vers le bas.

## Screen coordinates

Coordonnées dans l'espace CSS du viewport. Elles sont obtenues depuis les coordonnées monde par la
Camera2D et suivent les mêmes orientations d'axes.

## Renderer

Couche `render` qui lit le World et utilise les primitives de l'Engine pour produire une
représentation visuelle. Elle ne modifie jamais le World et ne décide jamais de la géographie.

## RenderSurface

Contrat minimal de surface de rendu indépendante du thème. Il expose les primitives nécessaires au
Renderer sans lui imposer directement le DOM.

## CanvasRenderer

Renderer applicatif actuel qui dessine déterministement le fond, le terrain, les connexions, les
localisations et les labels sur une `RenderSurface`.

## VisualTheme

Contrat immutable décrivant l'apparence : couleurs, bandes d'altitude, styles de connexions,
localisations et labels. Les données et la géographie restent hors du thème.

## SeventiesTheme

Implémentation actuelle de `VisualTheme` fournissant la direction visuelle 70's par défaut, sans
condition spécifique dans `CanvasRenderer`.

## Metadata

Informations décrivant un document ou un atlas sans constituer une identité musicale, une
géographie ou une apparence. La metadata JSON V1 reste dans `ImportedMusicDocument`.

---

# Frontières fondamentales

```text
Music décide du sens musical.
Knowledge représente le sens générique.
World décide de la géographie.
Engine fournit les mécanismes génériques.
Render décide de l'apparence à partir d'un World existant.
```

Une identité canonique ne dépend jamais de coordonnées. Une apparence ne modifie jamais les
données ni la géographie.
