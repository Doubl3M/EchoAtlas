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

## Current Broadcast

Snapshot ordonné de l'état de diffusion courant, possédé par l'application et explicitement hors de
`World(T)`. Ses entrées peuvent référencer facultativement une identité Music, mais restent
affichables sans catalogue, Knowledge Graph ou géographie. Une diffusion n'est jamais une adoption
ni un Listening Event implicite.

## Listening History

Suite canonique immutable de `ListeningEvent`, distincte de `MusicCatalog`. Elle est ordonnée par
instant croissant puis ID lexical, indépendamment de l'ordre d'entrée. `History(T)` contient tous
les événements dont `occurredAt <= T`; cette coupe inclusive est reconstruite directement, sans
notion implicite de « maintenant » ni dépendance à une consultation antérieure.

## Listening Event

Fait d'écoute explicite et immutable possédant un ID stable, un `occurredAt` en millisecondes Unix
sous forme d'entier sûr et une identité Music canonique `(kind, ID)`. Il peut référencer une identité
absente du catalogue courant. Il ne devient ni une propriété structurelle de `MusicCatalog`, ni un
événement analytics de navigation.

## Temporal Navigation

Exploration de l'évolution de l'atlas musical à partir du Listening History. Elle est critique
pour Version 1.0 et reste distincte du temps d'exécution, du framerate et du parcours de
l'utilisateur dans l'interface. Elle reconstruit un `World(T)` historiquement fidèle plutôt que de
masquer simplement les éléments apparus après `T`. Le showcase navigateur propose des jalons
explicites et reconstruit à chacun d'eux `Presence(T)`, le Knowledge Graph et le Geographic World,
sans déplacer la Camera ni rembobiner le `CurrentBroadcast`.

## Temporal Music Rules Version

Version explicite des règles Music qui déterminent la présence à un instant. La première valeur,
`temporal-music-presence-v1`, reste distincte des versions JSON, géographiques, de layout et de
physique World.

## Temporal Music Snapshot

Snapshot Music immutable à un instant explicite `T`. Son catalogue contient uniquement les
identités présentes et les relations originales dont les deux endpoints sont présents.

## Presence(T)

Ensemble des identités Music directement écoutées à ou avant `T`, résolues dans le catalogue, puis
complété par leurs ancêtres structurels V1. Presence répond à « qui existe ? », sans calculer
Activity ni Appearance.

## Canonical Structural Music Relations V1

Les trois triplets exacts Genre `includes` Artist, Artist `performed` Album et Album `contains`
Track. Ils sont dirigés, sensibles à la casse et ne possèdent aucun alias silencieux.

## Activity

Mesure Music temporelle indépendante de Presence et Appearance. `music-activity-v1` expose le
dernier instant d'activité résolu à `T` et propage le maximum aux ancêtres structurels V1. Seuls les
Artists sont classés `active` ou `inactive`, avec une frontière de 180 jours exacts d'inactivité,
soit l'approximation produit V1 de six mois et non une durée calendaire. Une identité sans activité
résolue n'a aucun résultat Activity, et un Artist inactive n'est pas pour autant absent de
Presence(T).

## Music Activity Rules Version

Version explicite des règles qui mesurent et classifient Activity(T). La première valeur,
`music-activity-v1`, est distincte de `temporal-music-presence-v1`, `music-geography-v1`,
`geographic-layout-v1`, `world-v1-exact` et de toute future version Appearance.

## Appearance

Traduction géographique ou visuelle future d'une identité et de son Activity. Elle n'appartient ni
au Listening History, ni au snapshot de présence Music, ni au projecteur Activity. Une
classification `inactive` ne choisit donc pas elle-même une ruine, un marqueur ou un style.

## Geographic Appearance Snapshot

Snapshot World générique et immutable des conditions non-default de features géographiques
existantes. Il est sparse : une feature absente du snapshot est `normal`. Une condition `ruined`
change l'apparence, jamais l'identité, le rôle ou le containment de la feature.

## Music Geographic Appearance Version

Version de la politique applicative traduisant Activity Music en Appearance World. La première,
`music-geographic-appearance-v1`, applique `ruined` à tous les Districts canoniques d'un Artist
inactive. Elle est distincte des versions Presence, Activity, Geography, Layout et World.

## World(T)

Snapshot géographique à l'instant explicite `T`, déterminé par `MusicCatalog`, le Listening History
jusqu'à `T`, la seed, la version des règles temporelles et `WorldConfig`. Cette configuration contient
notamment `WorldGenerationVersion`, les dimensions logiques, `TerrainConfig` et les paramètres
explicites de placement actuels. À entrées identiques, un accès direct et un retour ultérieur à `T`
produisent exactement le même snapshot. Le User Journey Analytics n'y participe jamais.

## WorldGenerationVersion

Version explicite de la physique géographique observable utilisée pour produire un World, portée par
`WorldConfig.generationVersion`. La seule version actuelle, `world-v1-exact`, conserve le placement
exact existant. Elle est indépendante de `metadata.version`, qui versionne le format JSON importé.
La `WorldConfig` devra être enregistrée par tout futur format de projet permettant de reconstruire
un `World(T)`.

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

## GeographicHierarchy

Snapshot immutable et sans géométrie décrivant les identités géographiques, leur containment et
leurs sources Knowledge en ordre canonique. Cette fondation coexiste avec le `GeographicWorld`
actuel pendant la migration et fera partie de toute future reconstruction déterministe de
`World(T)`.

## GeographicFeature

Identité géographique spatiale possédant un rôle, un parent optionnel et éventuellement un
Knowledge Node source. Les rôles runtime actuels sont `continent`, `district` et `building`. Un
même Knowledge Node peut être la source de plusieurs features.

## GeographicContent

Représentation non nécessairement spatiale d'une identité Knowledge contenue dans un
GeographicFeature. Le cas canonique visé est un Track contenu dans un Building.

## GeographicFocusTarget

Destination géographique générique possible pour une identité Knowledge. Elle distingue une
feature représentant directement l'identité d'un container représentant son contenu. Une identité
peut avoir zéro, une ou plusieurs cibles; leur ordre canonique n'exprime aucune préférence produit.

## GeographicFocusResolver

Service World sans géométrie qui découvre toutes les `GeographicFocusTarget` d'une identité puis
peut en choisir une selon un contexte de containment. La proximité utilise les chemins
hiérarchiques, jamais des coordonnées. Le flux futur est `Knowledge identity → geographic
representation(s) → contextual geographic focus → future layout → Camera`.

## GeographicLayout

Snapshot spatial immutable et complet d'une `GeographicHierarchy` pour une étendue World donnée.
Chaque feature possède exactement un placement canonique; les contenus n'en possèdent aucun. Le
layout ne réinterprète ni Music ni Knowledge et coexiste provisoirement avec le `GeographicWorld`
historique.

## Geographic Region

Placement surfacique défini par une envelope axis-aligned et un anchor logique. L'envelope sert au
containment et au focus; elle ne signifie jamais que la future frontière rendue sera rectangulaire.

## Geographic Site

Placement ponctuel d'une feature dans les coordonnées logiques World. Un Site ne peut pas contenir
d'autre feature dans le contrat actuel, mais une feature racine peut techniquement être un Site.

## Geographic Spatial Focus

Point logique World obtenu depuis une `GeographicFocusTarget` et un `GeographicLayout`. Une Region
utilise son anchor et un Site sa position. Aucun zoom, viewport ou mouvement Camera n'est produit.

## GeographicLayoutGenerationVersion

Version de la politique transformant une `GeographicHierarchy` en `GeographicLayout`. La première
valeur, `geographic-layout-v1`, est indépendante de `music-geography-v1`, de `world-v1-exact` et de
la version du format JSON.

## geographic-layout-v1

Partition rectangulaire hiérarchique déterministe dont les Regions sont pondérées par leur nombre
de Sites descendants, avec un minimum de `1`. Les Sites terminaux utilisent une grille intérieure.
La seed influence l'ordre spatial par identité stable. Les rectangles sont des envelopes de
génération, jamais une prescription de frontière rendue.

## Semantic Geography

Traduction géographique canonique `Genre → Continent`, `Artist → District`, `Album → Building` et
`Track → Building Content`. Les relations musicales restent dans Knowledge; World possède le
containment résultant. City est un niveau spatial prévu mais sa signification et sa génération
restent non résolues; aucun rôle City runtime n'existe encore.

## MusicGeographyInterpretationVersion

Identité des règles applicatives qui traduisent Music et Knowledge vers la hiérarchie géographique
générique. `music-geography-v1` interprète uniquement les relations dirigées Genre → Artist,
Artist → Album et Album → Track. Elle est indépendante de `metadata.version`, de la version des
règles temporelles et de `WorldGenerationVersion`.

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

Pour la navigation temporelle, `T` et le Listening History jusqu'à `T` sont des entrées explicites.
Le déterminisme de `World(T)` n'impose ni les mêmes coordonnées entre `T1` et `T2`, ni la conservation
du layout d'une ancienne version d'algorithme. Les coordonnées golden actuelles protègent
l'implémentation présente contre les régressions involontaires; elles ne constituent pas une
promesse de compatibilité éternelle.

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
