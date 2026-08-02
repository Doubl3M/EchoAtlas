# 10 · JSON Specification

> *Toutes les cartes commencent par des données.*
>
> *Toutes les données doivent raconter la même histoire.*

---

# Objectif

Ce document définit le format officiel des données utilisées par Music Atlas.

Il constitue le contrat d'entrée du World Engine.

Le moteur ne dépend d'aucun service externe.

Toute source (Spotify, Discogs, Last.fm, fichiers personnels...) doit être convertie vers ce format avant d'être interprétée.

---

# Principes

Le format JSON est :

- lisible par un humain ;
- versionné ;
- extensible ;
- indépendant du moteur.

Les données décrivent uniquement des faits.

Aucune information géographique n'y apparaît.

Le World Engine est seul responsable de leur interprétation.

---

# Structure générale

```text
Atlas

├── metadata
├── artists
├── albums
├── tracks
├── labels
├── playlists
├── listens
└── settings
```

---

# metadata

Décrit l'origine du jeu de données.

```json
{
  "title": "Music Atlas",
  "owner": "Mat",
  "version": "1.0",
  "generatedAt": "...",
  "seed": 123456,
  "locale": "fr"
}
```

---

# artists

Liste des artistes.

```json
{
  "id": "artist-radiohead",
  "name": "Radiohead",
  "country": "UK",
  "formed": 1985,
  "tags": [
    "alternative",
    "experimental"
  ]
}
```

Les tags sont informatifs.

Ils ne déterminent jamais directement un continent.

---

# albums

Chaque album possède un identifiant unique.

```json
{
  "id": "album-ok-computer",
  "artistId": "artist-radiohead",
  "title": "OK Computer",
  "year": 1997,
  "labelId": "label-parlophone",
  "duration": 3201
}
```

---

# tracks

Les morceaux restent optionnels.

Ils permettent un niveau de détail plus fin.

```json
{
  "id": "track-paranoid-android",
  "albumId": "album-ok-computer",
  "title": "Paranoid Android",
  "duration": 385,
  "trackNumber": 2
}
```

---

# labels

Les labels enrichissent les relations.

```json
{
  "id": "label-4ad",
  "name": "4AD"
}
```

---

# playlists

Une playlist est une relation.

Elle ne représente jamais un lieu.

Le moteur pourra ensuite décider de la transformer en route.

---

# listens

Le cœur du système.

Chaque écoute constitue un événement.

```json
{
  "albumId": "...",
  "date": "...",
  "source": "spotify",
  "duration": 3120,
  "completed": true
}
```

Le moteur reconstruira ensuite les habitudes.

---

# settings

Les paramètres influencent la génération.

Exemple :

```json
{
  "worldScale": 1,
  "mountainGrowth": 1.2,
  "erosionSpeed": 0.3
}
```

Ces paramètres ne modifient jamais les données d'origine.

---

# Relations

Le JSON décrit uniquement les références.

```text
Artist

↓

Album

↓

Track

↓

Listen
```

Les graphes sont reconstruits par le moteur.

---

# Validation

Avant toute génération, le moteur valide :

- identifiants uniques ;
- références valides ;
- dates cohérentes ;
- types corrects ;
- valeurs obligatoires.

Une génération ne commence jamais avec un JSON invalide.

---

# Compatibilité

Le format suit le principe :

Une ancienne version reste lisible.

Les migrations sont explicites.

Le numéro de version permet au moteur d'appliquer les adaptations nécessaires.

---

# Évolutivité

Toute nouvelle propriété doit être :

- optionnelle dans un premier temps ;
- documentée ;
- rétrocompatible.

Le JSON doit pouvoir évoluer sans casser les atlas existants.

---

# Conclusion

Le JSON décrit une bibliothèque.

Le World Engine décrit une vie.

Cette distinction est fondamentale.

---

> *Les données sont le point de départ.*
>
> *Jamais la destination.*