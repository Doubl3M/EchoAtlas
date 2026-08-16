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
│     ├── Cities (niveau prévu, règle non résolue, non instancié)
│     └── Districts
│            └── Buildings
│                   └── Building Contents
│
├── Connections
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

Les événements d'écoute appartiennent au modèle `ListeningHistory` distinct requis pour la
navigation temporelle V1. Les paramètres applicatifs n'appartiennent pas au catalogue musical.

## Listening History

`ListeningHistory` est une suite canonique immutable de faits d'écoute explicites. Chaque
`ListeningEvent` possède un ID stable, un instant `occurredAt` exprimé en millisecondes Unix sous
forme d'entier sûr, et une identité Music canonique `(kind, ID)`. Il ne contient ni géographie, ni
durée écoutée, ni provenance implicite.

L'ordre d'entrée n'a aucun sens. L'ordre historique est `occurredAt` croissant, puis ID d'événement
selon une comparaison lexicale JavaScript explicite. Deux événements au même instant restent deux
faits distincts lorsque leurs IDs diffèrent.

```text
History(T) = ListeningEvents dont occurredAt <= T
```

`T` est inclusif et toujours fourni explicitement. L'historique n'utilise aucune horloge système et
sa consultation ne dépend d'aucun snapshot précédent. Il peut référencer une identité Music absente
du catalogue courant afin de conserver un fait issu d'un catalogue incomplet, d'un import différé
ou d'une source externe. La résolution de cette identité appartiendra au futur projecteur temporel.

## Présence musicale temporelle V1

Les relations structurelles Music V1 sont exactement :

```text
Genre  --includes-->  Artist
Artist --performed--> Album
Album  --contains-->  Track
```

Les kinds sont exacts, sensibles à la casse et ne possèdent aucun alias implicite. Une relation
structurelle est reconnue par le triplet complet `(source kind, relation kind, target kind)`.

`temporal-music-presence-v1` définit `Presence(T)` comme les identités directement écoutées au plus
tard à `T`, résolues dans le catalogue fourni, auxquelles s'ajoute la fermeture ascendante de leurs
ancêtres structurels canoniques. Une écoute Track peut ainsi révéler tous ses Albums parents, leurs
Artists puis leurs Genres. Label, Playlist et Compilation peuvent être présents par écoute directe,
mais aucune propagation structurelle ne leur est attribuée en V1.

Le snapshot conserve uniquement les entités présentes et les relations originales dont les deux
extrémités sont présentes. Il ne crée ni entité ni relation. Une identité d'écoute absente du
catalogue est ignorée par cette projection sans effacer le fait historique.

Presence détermine qui existe à `T`. Activity décrira plus tard l'état temporel d'une identité.
Appearance décrira sa traduction géographique ou visuelle. Ces responsabilités restent séparées.

## Snapshot temporel du Monde

Le Monde temporel est une reconstruction déterministe :

```text
MusicCatalog
+ ListeningHistory jusqu'à T
+ seed
+ version des règles temporelles
+ WorldConfig
→ World(T)
```

`MusicCatalog` décrit la structure musicale. `ListeningHistory` décrit les événements musicaux
jusqu'à l'instant explicite `T`. User Journey Analytics décrit uniquement le parcours dans
EchoAtlas et ne participe jamais à `World(T)`.

À entrées identiques, accéder directement à `T` ou y revenir plus tard produit exactement le même
snapshot. La version des règles temporelles et de l'algorithme de génération reste explicite ou
traçable lorsqu'elle est nécessaire à cette reproductibilité.

`WorldConfig` contient notamment `WorldGenerationVersion`, les dimensions logiques, `TerrainConfig`
et les paramètres explicites de placement actuels. `WorldConfig.generationVersion` identifie la
physique géographique observable ; sa valeur actuelle est `world-v1-exact`. Elle est distincte de
`metadata.version`, qui versionne uniquement le format JSON importé. Tout futur format de projet
capable de reconstruire un Monde historique devra conserver cette configuration World.

## Current Broadcast

Le `CurrentBroadcast` décrit les écoutes représentées comme courantes dans l'expérience. Il reste
hors de `World(T)` et ne reçoit aucun instant historique implicite : changer `T` reconstruit le
Monde temporel sans rembobiner le broadcast courant.

Chaque entrée possède une identité locale au broadcast, un titre de morceau, un nom d'artiste et
une provenance explicite. Une identité Music existante peut être référencée facultativement, mais
une entrée reste valide sans `MusicEntity`, `KnowledgeNode`, `GeographicFeature` ou
`WorldLocation`. L'ordre fourni est significatif et n'est pas trié. Représenter ou sélectionner une
entrée ne l'adopte pas : cela ne modifie ni le catalogue ni le Monde et ne crée aucun
`ListeningEvent`. Une future écoute acceptée dans `ListeningHistory` passera par une action explicite
séparée.

La fidélité historique ne consiste pas à masquer les éléments apparus après `T`. L'état complet est
reconstruit depuis l'historique disponible à cette date. Ainsi, selon de futures règles produit, un
artiste sans écoute pendant six mois pourra devenir une ruine et une route inutilisée pendant un an
pourra disparaître sous l'herbe. En remontant avant ces transformations, la ruine pourra redevenir un
lieu actif et la route réapparaître. Ces exemples définissent le sens attendu, pas leur future
implémentation.

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

Le continent représente un Genre.

## Possède

- identifiant
- nom
- géométrie
- enfants géographiques
- surface
- couleur
- statistiques

## Relations

```
World

↓

Continent

↓

City éventuelle ou District
```

## Invariants

La géométrie et le containment appartiennent au World; la relation musicale source reste dans le
Knowledge Graph.

---

# City

City est un niveau spatial prévu entre Continent et District.

Sa signification musicale et sa règle de génération sont non résolues. Aucune City n'est
instanciée tant que cette règle n'est pas canonisée. Un District peut donc transitoirement avoir un
Continent comme parent.

# District

Le District représente un Artist.

---

## Possède

- identifiant géographique stable
- Artist source éventuel
- parent géographique
- bâtiments
- connexions

## Relations

```
Continent ou future City

↓

District

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

# Building Content

Un Building Content représente un Track contenu dans un Building sans lui imposer une position
mondiale autonome.

Il conserve l'identité du Knowledge Node source et l'identité du Building qui le contient.

---

# Métaphores legacy et futurs états

Mountain, Volcano, Port, Ruin, Marsh et Desert ne sont plus des identités principales concurrentes
de Continent, District ou Building. Ces anciennes traductions restent à réinterpréter. Un Album
oublié pourrait par exemple devenir ultérieurement un `Building(state = ruined)`, et un Artist
inactif un `District(state = ruined)`, mais aucun modèle d'état n'est défini ou implémenté ici.

---

# Mountain

Cette ancienne traduction est legacy et ne définit plus l'identité d'une œuvre.

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

Cette ancienne traduction est legacy et ne définit plus l'identité d'une découverte.

## Attributs

- activité
- trafic
- date
- connexions

Un port peut devenir une ville importante.

---

# Ruin

Cette ancienne traduction est legacy; une ruine éventuelle devra être un état compatible avec
l'identité structurelle du lieu.

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

Continent

↓

District
```

Toutes les connexions sont orientées.

---

# Identifiants

Chaque objet possède un identifiant stable.

Exemple :

```
world-1

continent:genre:rock

district:artist:bowie

building:album:low

content:track:sound-and-vision
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

     ├── Cities (niveau prévu, non instancié sans règle)

     └── Districts

           └── Buildings

                 └── Building Contents
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
