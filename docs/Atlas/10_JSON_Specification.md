# 10 · JSON Specification

> *Toutes les cartes commencent par des données.*
>
> *Toutes les données doivent raconter la même histoire.*

---

# Objectif

Ce document définit le format JSON V1 officiel des données musicales importables par Music Atlas.

Le format transforme un document externe validé en une enveloppe contenant :

```text
ImportedMusicDocument
│
├── metadata
└── catalog: MusicCatalog
```

Le `MusicInterpreter` reçoit uniquement le `MusicCatalog`.

Les données ne contiennent aucune information géographique.

---

# Principes

Le format JSON V1 est :

- versionné ;
- strict ;
- déterministe ;
- indépendant de sa source ;
- indépendant du World et du Renderer.

La version officielle est la chaîne `"1.0"`.

Un importeur V1 accepte uniquement cette version. Aucune migration ou conversion implicite n'est
autorisée.

Les champs inconnus sont refusés à tous les niveaux. Une valeur n'est jamais convertie,
normalisée ou corrigée silencieusement.

---

# Structure racine

Le document racine est un objet contenant exactement les propriétés suivantes :

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `metadata` | objet Metadata | oui | Enveloppe documentaire |
| `artists` | tableau Artist | oui | Artistes |
| `albums` | tableau Album | oui | Albums |
| `tracks` | tableau Track | oui | Morceaux |
| `labels` | tableau Label | oui | Labels |
| `playlists` | tableau Playlist | oui | Playlists |
| `relations` | tableau Relation | oui | Relations musicales explicites |

Une collection sans élément est représentée par `[]`. L'absence d'une collection est invalide.

```json
{
  "metadata": {
    "version": "1.0"
  },
  "artists": [],
  "albums": [],
  "tracks": [],
  "labels": [],
  "playlists": [],
  "relations": []
}
```

---

# Règles communes

Un identifiant est une chaîne non vide sans espaces périphériques. Il est conservé exactement,
sans normalisation Unicode ni transformation silencieuse.

Les identifiants d'entités sont uniques au sein de leur kind. Deux kinds différents peuvent
utiliser le même identifiant canonique.

Les noms, titres, kinds et autres chaînes définies comme non vides suivent les mêmes règles
d'espaces périphériques.

Tout nombre doit être fini. Un entier doit également être un entier sûr JavaScript.

Les tableaux doivent être de véritables tableaux JSON. `null` ne remplace jamais un champ absent
ou une collection vide.

---

# Metadata

`metadata` est une enveloppe documentaire distincte de `MusicCatalog`.

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `version` | chaîne exacte `"1.0"` | oui | Version du format JSON |
| `title` | chaîne non vide | non | Titre descriptif du document |
| `owner` | chaîne non vide | non | Propriétaire déclaré |
| `generatedAt` | chaîne RFC 3339 | non | Date déclarative de génération |
| `seed` | nombre entier sûr | non | Seed déclarative destinée à la reproductibilité |
| `locale` | chaîne non vide | non | Locale descriptive |

`generatedAt` n'intervient jamais dans le déterminisme de l'import, du Knowledge Graph ou du
monde.

La seed conserve le type numérique déjà défini par le format. Lorsqu'elle est présente, elle est
conservée exactement dans `metadata` afin de rester exploitable ultérieurement. Elle ne devient
pas une entité du catalogue ni un nœud du Knowledge Graph.

Les autres champs descriptifs sont également conservés dans l'enveloppe d'import.

---

# Artists

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant canonique de l'artiste |
| `name` | chaîne non vide | oui | Nom humain |
| `country` | chaîne non vide | non | Pays déclaré |
| `formed` | entier sûr | non | Année de formation |
| `tags` | tableau de chaînes non vides | non | Tags informatifs |

Les tags ne déterminent aucune géographie.

```json
{
  "id": "artist-radiohead",
  "name": "Radiohead",
  "country": "UK",
  "formed": 1985,
  "tags": ["alternative", "experimental"]
}
```

---

# Albums

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant canonique de l'album |
| `title` | chaîne non vide | oui | Titre humain |
| `year` | entier sûr | non | Année de sortie |
| `duration` | nombre fini positif ou nul | non | Durée en secondes |

Un album ne contient ni `artistId` ni `labelId`. Ces liens sont exprimés uniquement dans
`relations`.

```json
{
  "id": "album-ok-computer",
  "title": "OK Computer",
  "year": 1997,
  "duration": 3201
}
```

---

# Tracks

Les morceaux permettent un niveau de détail optionnel. La collection `tracks` reste obligatoire,
mais peut être vide.

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant canonique du morceau |
| `title` | chaîne non vide | oui | Titre humain |
| `duration` | nombre fini positif ou nul | non | Durée en secondes |
| `trackNumber` | entier sûr strictement positif | non | Numéro déclaré |

Un morceau ne contient pas `albumId`. Ce lien est exprimé uniquement dans `relations`.

```json
{
  "id": "track-paranoid-android",
  "title": "Paranoid Android",
  "duration": 385,
  "trackNumber": 2
}
```

---

# Labels

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant canonique du label |
| `name` | chaîne non vide | oui | Nom humain |

```json
{
  "id": "label-parlophone",
  "name": "Parlophone"
}
```

---

# Playlists

Une playlist est une entité musicale. Son contenu est représenté exclusivement par des relations
explicites.

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant canonique de la playlist |
| `name` | chaîne non vide | oui | Nom humain |

```json
{
  "id": "playlist-favorites",
  "name": "Favorites"
}
```

---

# Relations

`relations` est l'unique représentation des liens entre entités musicales.

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `id` | chaîne identifiante | oui | Identifiant globalement unique de la relation |
| `kind` | chaîne non vide | oui | Nature musicale conservée exactement |
| `source` | Endpoint | oui | Source dirigée |
| `target` | Endpoint | oui | Destination dirigée |
| `weight` | nombre fini | non | Poids explicite |

L'absence de `weight` laisse le modèle Music appliquer ultérieurement son poids structurel neutre
`1`. La valeur `0` et les valeurs négatives sont valides lorsqu'elles sont explicites.

Chaque endpoint contient exactement :

| Champ | Type | Obligatoire | Signification |
|---|---|---:|---|
| `kind` | `"artist"`, `"album"`, `"track"`, `"label"` ou `"playlist"` | oui | Kind de l'entité référencée |
| `id` | chaîne identifiante | oui | Identifiant canonique dans ce kind |

La paire `(kind, id)` doit désigner une entité existante. Elle permet par exemple de distinguer
l'artiste `"42"` de l'album `"42"`.

Une relation conserve sa direction. Aucun lien inverse ou relation implicite n'est créé.

```json
{
  "id": "relation:artist-album:radiohead-ok-computer",
  "kind": "performed",
  "source": {
    "kind": "artist",
    "id": "artist-radiohead"
  },
  "target": {
    "kind": "album",
    "id": "album-ok-computer"
  },
  "weight": 1
}
```

---

# Entités non importables en V1

Le modèle Music peut représenter `genre` et `compilation`, mais le format JSON V1 ne définit
aucune collection pour ces kinds. Ils ne sont donc pas importables en V1 et ne sont pas valides
dans les endpoints de relations V1.

Aucune collection supplémentaire n'est déduite des tags.

---

# Listening History

Les écoutes sont des événements temporels. Elles n'appartiennent pas à `MusicCatalog` et ne sont
pas acceptées par le format importable V1 défini ici.

Un futur modèle d'historique pourra notamment représenter les faits déjà identifiés : album,
date, source, durée et complétion. Ce futur contrat ne fait pas partie de JSON Import V1.

---

# Settings

Les paramètres de génération et la configuration applicative n'appartiennent pas au domaine
musical importé. La propriété racine `settings` n'est pas acceptée en V1.

La configuration du World reste indépendante de `MusicCatalog` et de l'enveloppe documentaire.

---

# Validation

Avant de construire l'enveloppe d'import, l'importeur valide :

- la racine et toutes les collections obligatoires ;
- la version exacte `"1.0"` ;
- les champs obligatoires, optionnels et inconnus ;
- les types et les valeurs numériques finies ;
- les identifiants et les chaînes ;
- l'unicité des entités au sein de leur kind ;
- l'unicité globale des relations ;
- l'existence et le kind exact de chaque endpoint.

Une erreur indique le chemin concerné et sa raison. Une donnée invalide n'atteint jamais
`MusicCatalog`.

---

# Exemple complet

```json
{
  "metadata": {
    "version": "1.0",
    "title": "Music Atlas",
    "owner": "Mat",
    "generatedAt": "2026-08-07T12:00:00Z",
    "seed": 123456,
    "locale": "fr"
  },
  "artists": [
    {
      "id": "artist-radiohead",
      "name": "Radiohead",
      "country": "UK",
      "formed": 1985,
      "tags": ["alternative", "experimental"]
    }
  ],
  "albums": [
    {
      "id": "album-ok-computer",
      "title": "OK Computer",
      "year": 1997,
      "duration": 3201
    }
  ],
  "tracks": [
    {
      "id": "track-paranoid-android",
      "title": "Paranoid Android",
      "duration": 385,
      "trackNumber": 2
    }
  ],
  "labels": [{ "id": "label-parlophone", "name": "Parlophone" }],
  "playlists": [{ "id": "playlist-favorites", "name": "Favorites" }],
  "relations": [
    {
      "id": "relation:performed",
      "kind": "performed",
      "source": { "kind": "artist", "id": "artist-radiohead" },
      "target": { "kind": "album", "id": "album-ok-computer" },
      "weight": 2
    },
    {
      "id": "relation:released-by",
      "kind": "released-by",
      "source": { "kind": "album", "id": "album-ok-computer" },
      "target": { "kind": "label", "id": "label-parlophone" }
    },
    {
      "id": "relation:contains-track",
      "kind": "contains",
      "source": { "kind": "album", "id": "album-ok-computer" },
      "target": { "kind": "track", "id": "track-paranoid-android" }
    },
    {
      "id": "relation:playlist-entry",
      "kind": "contains",
      "source": { "kind": "playlist", "id": "playlist-favorites" },
      "target": { "kind": "album", "id": "album-ok-computer" }
    }
  ]
}
```

---

# Déterminisme

La validation ne dépend ni de la locale, ni du système, ni du temps, ni d'un générateur aléatoire.

Deux documents représentant les mêmes entités et relations dans des ordres différents produisent
des catalogues dont l'interprétation donne le même Knowledge Graph observable.

`generatedAt` reste purement descriptif.

---

# Compatibilité

Toute évolution du format possède une nouvelle version explicite.

Un importeur V1 refuse une autre version. Les migrations sont explicites et ne font pas partie de
ce contrat.

---

# Conclusion

Le JSON V1 décrit un document musical validé.

`metadata` décrit l'import.

`MusicCatalog` décrit la structure musicale.

Le World décide seul de la géographie.

> *Les données sont le point de départ.*
>
> *Jamais la destination.*
