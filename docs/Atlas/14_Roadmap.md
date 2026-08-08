# 14 · Roadmap Reference

> Vue de lecture de la roadmap canonique

---

# Source de vérité

Le fichier [`ROADMAP.md`](../../ROADMAP.md) à la racine est l'unique roadmap canonique
d'EchoAtlas.

Le présent document n'ajoute, ne retire, ne réordonne et ne redéfinit aucune phase. Il fournit une
vue lisible de l'ordre officiel et un instantané de l'état d'implémentation observé dans le code et
le changelog.

En cas d'écart, `ROADMAP.md` prévaut toujours.

---

# Statut canonique publié

Le tableau `Current Status` de `ROADMAP.md` indique actuellement :

| Phase | Statut canonique publié |
|---|---|
| Phase 0 — Editorial Foundation | Complete |
| Phase 1 — Engine Foundation | Complete |
| Phase 2 — Math Engine | Complete |
| Phase 3 — Terrain Engine | Complete |
| Phase 4 — Knowledge Graph | Complete |
| Phase 5 — World Engine | Complete |
| Phase 6 — Camera | Complete |
| Phase 7 — Renderer | Complete |
| Phase 8 — Music Interpreter | Complete |
| Phase 9 — JSON Import | Complete |
| Phase 10 — First Navigable Map | Complete |
| Phase 11 — Optimization | Next |
| Phase 12 — Version 1.0 | Planned |

---

# Ordre technique officiel

Jusqu'à la première carte navigable :

```text
Foundation
↓
Math Engine
↓
Terrain Engine
↓
Knowledge Graph
↓
World Engine
↓
Camera
↓
Renderer
↓
Music Interpreter
↓
JSON Import
↓
First Navigable Map
```

Après cette étape, la roadmap canonique prévoit Optimization puis Version 1.0.

---

# État réel actuel

## Terminé

| Étape technique | État observé |
|---|---|
| Engine Foundation | Projet TypeScript/Vite, cycle de vie applicatif et infrastructure de tests opérationnels |
| Math Engine | Seed, hash, PRNG, interpolation et Value Noise 2D déterministes |
| Terrain Engine | Configuration, HeightField et génération fBm déterministe |
| Knowledge Graph | Nœuds, relations et graphe sémantique immutables et déterministes |
| World Engine | GeographicWorld, localisations, connexions, terrain et placement relationnel déterministes |
| Camera | Transformations 2D, pan, zoom et redimensionnement indépendants du navigateur |
| Renderer Foundation | Renderer Canvas par couches et thème 70's injectable |
| Music Interpreter | Domaine musical typé et traduction déterministe vers le Knowledge Graph |
| JSON Import V1 | Parsing, validation stricte et enveloppe d'import immutable vers MusicCatalog |
| First Navigable Map | Pipeline JSON complet, carte Canvas, labels Music, pan, zoom et resize navigateur opérationnels |

Ces lignes décrivent les fondations effectivement livrées. Elles ne modifient pas les objectifs,
livrables complets ou critères de sortie définis pour chaque phase dans `ROADMAP.md`.

## Prochain

### Phase 11 — Optimization

La prochaine étape canonique consiste à préparer les grandes bibliothèques, conformément au
périmètre défini dans `ROADMAP.md` :

```text
Spatial indexing
Chunk loading
Memory optimization
Rendering optimization
Caching
```

Ce document ne fixe ni leur conception détaillée ni leur ordre interne.

## Futur

### Phase 12 — Version 1.0

Atteindre les exigences canoniques : importer la musique, générer un atlas, sauvegarder et recharger
un projet, puis explorer le monde généré.

**V1 Critical**

- navigation temporelle ;
- modèle de Listening History distinct, composé conceptuellement de Listening Events.

La navigation temporelle doit permettre d'explorer l'évolution de l'atlas musical. La capacité à
donner une raison structurante de revenir consulter son atlas est une hypothèse produit à valider,
pas un effet de rétention démontré.

`MusicCatalog` reste structurel. Le Listening History reste temporel et séparé des User Journey
Analytics. La reconstruction temporelle dépend uniquement d'entrées explicites et déterministes,
sans notion implicite de « maintenant » dans les couches génériques.

**V1 Required**

- recherche ;
- filtres ;
- informations contextuelles et tooltips ;
- statistiques ;
- contrôle des couches.

Ces exigences fonctionnelles appartiennent à Version 1.0 et ne font pas partie de Phase 11.

---

# Lecture des statuts

- **Terminé** signifie qu'une fondation correspondante existe, compile et est testée dans le dépôt.
- **Prochain** désigne la prochaine étape de l'ordre technique canonique.
- **Futur** reprend uniquement les phases ultérieures déjà définies dans `ROADMAP.md`.

Les idées non engagées n'appartiennent pas à cette vue. Elles sont consignées dans
[`15_Backlog.md`](15_Backlog.md) sans priorité ni date implicite.
