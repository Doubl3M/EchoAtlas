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
sont dirigées et leur kind exact participe au contrat : Genre `includes` Artist crée le District,
Artist `performed` Album propage le Building dans chaque District représenté, puis Album `contains`
Track propage le Building Content. Les relations inverses, les aliases, les autres relation kinds
ou d'autres couples de kinds sont ignorés et aucun parent géographique de repli n'est inventé.
Cette version d'interprétation est distincte de `metadata.version`, de la version des règles
temporelles et de `WorldConfig.generationVersion`.

Une identité Knowledge peut ensuite résoudre vers zéro, une ou plusieurs représentations
géographiques. Une feature constitue une cible directe; un contenu utilise sa feature container
comme cible tout en conservant son identité de contenu. Le choix contextuel privilégie la branche
de containment partageant l'ancêtre commun le plus profond, puis la distance hiérarchique et enfin
l'identité canonique. Cette étape ne calcule ni coordonnées, ni zoom, ni mouvement Camera et n'est
pas encore branchée au showcase.

Le `GeographicLayout` constitue un snapshot spatial immutable distinct de la hierarchy. Chaque
feature possède exactement un placement : une Region avec envelope axis-aligned et anchor, ou un
Site avec position logique World. Les bounds d'une Region servent au containment, au focus et au
futur culling; elles ne décrivent pas sa future frontière organique rendue. Un contenu n'a aucun
placement propre. Le spatial focus transforme ensuite une cible en anchor de Region ou position de
Site, sans zoom ni intégration Camera.

Le pipeline préparé est donc :

```text
Knowledge
→ Semantic Geography
→ GeographicHierarchy
→ Geographic Focus
→ GeographicLayout
→ Spatial Focus
→ future Camera integration
```

La première politique de génération, `geographic-layout-v1`, utilise une partition rectangulaire
hiérarchique déterministe. Les rôles Continent et District deviennent des Regions; Building devient
un Site. La surface relative d'une Region dépend du nombre de Sites descendants, avec un poids
minimal de `1` pour une Region vide. La seed réordonne spatialement les siblings à partir de leurs
identités stables; elle ne modifie ni leur existence, ni leur identité, ni leur containment.

Les Sites terminaux sont répartis aux centres d'une grille adaptée au ratio de leur Region. Les
Contents ne participent ni au poids ni au placement. Cette version rejette les Site roots ainsi que
les enfants Region et Site mélangés sous un même parent. Ces restrictions appartiennent uniquement
à `geographic-layout-v1`, pas aux contrats génériques de hierarchy ou de layout. Les rectangles
produits restent des envelopes de génération et ne sont pas les futures frontières visuelles.

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

Le domaine Music fournit un `ListeningHistory` immutable, trié canoniquement une fois à sa
construction. Chaque événement associe un ID propre, une identité Music `(kind, ID)` et un
`occurredAt` en millisecondes Unix sûres. La coupe historique est inclusive :

```text
History(T) = events where occurredAt <= T
```

Une coupe est toujours calculée depuis l'historique complet et jamais depuis la coupe précédente.
Une identité absente du catalogue reste un fait valide; sa résolution ou son exclusion du futur
snapshot musical appartient à l'étape de projection temporelle, pas à l'historique.

La première projection d'existence est versionnée `temporal-music-presence-v1` :

```text
Presence(T)
= identités directement écoutées à ou avant T et résolues dans MusicCatalog
+ leurs ancêtres via Genre --includes--> Artist
                     Artist --performed--> Album
                     Album --contains--> Track
```

La fermeture remonte ces relations jusqu'au point fixe et accepte tous les parents valides. Label,
Playlist et Compilation restent limités à une présence directe. Le catalogue temporel résultant
conserve toutes les relations originales dont les deux endpoints sont présents, structurelles ou
non, sans en synthétiser.

Cette étape répond uniquement à l'existence. La projection indépendante
`music-activity-v1` calcule en parallèle le dernier instant d'activité résolu pour chaque identité
directement écoutée ou renouvelée par un descendant structurel :

```text
ListeningHistory + MusicCatalog + T
→ Presence(T)

ListeningHistory + MusicCatalog + T
→ Activity(T)

Presence(T) + Activity(T) + représentation géographique
→ future Appearance(T)
```

Le maximum des timestamps se propage exactement de Track vers Album, Artist et Genre, puis d'Album
vers Artist et Genre, et d'Artist vers Genre. Tous les parents structurels valides reçoivent ce
maximum. Label, Playlist et Compilation restent directs. Seuls les Artists sont classés : `active`
avant 180 jours exacts d'inactivité et `inactive` à partir de cette frontière, soit
15 552 000 000 ms. Il s'agit de l'approximation produit V1 de six mois, et non d'une durée
calendaire. `inactive` ne signifie jamais `absent`. Activity ne produit encore aucune apparence
géographique ou visuelle.

Le showcase exécute désormais réellement la reconstruction suivante pour chaque jalon temporel
sélectionné :

```text
ListeningHistory
→ Presence(T)
→ KnowledgeGraph(T)
→ GeographicWorld(T)
→ rendu Canvas
```

La couche application repart toujours du catalogue complet et de l'historique immutable. Elle
conserve la Camera courante, remplace les snapshots dérivés et laisse le `CurrentBroadcast` hors de
ce pipeline.

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
