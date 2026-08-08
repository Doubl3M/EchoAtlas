# 15 · Backlog

> Sujets identifiés, sans engagement de livraison

---

# Rôle

Ce backlog rassemble des idées acceptées, des améliorations identifiées, des besoins futurs et des
sujets à évaluer.

Une entrée ne constitue ni une promesse, ni une priorité, ni une phase de roadmap, ni une date de
livraison. L'ordre des catégories et des entrées n'exprime aucun classement.

---

# Rendering / Visual

## Thèmes alternatifs et choix utilisateur

- **Constat / besoin :** Fantasy et Pastel sont identifiés comme alternatives futures au thème
  70's actuel; l'utilisateur pourrait choisir son thème.
- **Contraintes :** injecter un `VisualTheme` sans modifier `CanvasRenderer`, le World ou les
  données.
- **Statut :** à évaluer.

## Relief moins quadrillé

- **Constat / besoin :** le terrain de fondation est rendu cellule par cellule et conserve un
  aspect de grille accepté temporairement.
- **Contraintes :** ne pas déplacer la génération de terrain dans le Renderer; mesurer avant toute
  optimisation.
- **Statut :** amélioration visuelle identifiée.

## Libellés applicatifs

- **Constat / besoin :** la première carte résout les labels Music via un provider générique; les
  futures politiques de libellés restent applicatives.
- **Contraintes :** ne jamais placer les textes applicatifs dans le Knowledge Graph ou le World
  Engine.
- **Statut :** fondation livrée; raffinements futurs non engagés.

## Chevauchement des labels

- **Constat / besoin :** des mondes plus denses nécessiteront une stratégie lisible pour les labels
  qui se chevauchent, ainsi qu'une éventuelle gestion des labels proches des limites du monde ou
  du viewport et un calibrage des seuils d'apparition selon les thèmes.
- **Contraintes :** conserver les identités sémantiques et ne pas modifier la géographie pour
  résoudre un problème d'affichage.
- **Statut :** besoin futur.

## Direction visuelle des relations

- **Constat / besoin :** les connexions sont dirigées dans les données, sans indicateur visuel
  obligatoire dans le Renderer Foundation.
- **Contraintes :** employer une primitive géométrique générique ou un style piloté par le thème;
  ne créer aucune relation inverse.
- **Statut :** option visuelle à évaluer.

---

# Interaction

## Commandes utilisateur de pan et zoom

- **Constat / besoin :** les bindings Pointer et Wheel de la première carte navigable pilotent
  désormais `Camera2D` via le contrôleur d'interaction générique.
- **Contraintes :** conserver les événements navigateur dans la couche Application; garder Camera
  et Interaction indépendantes du navigateur et du World.
- **Statut :** fondation livrée en Phase 10.

## Sélection, hover et navigation

- **Constat / besoin :** l'exploration devra permettre de viser, sélectionner et suivre les objets
  et connexions.
- **Contraintes :** préserver les IDs canoniques; ne pas utiliser les coordonnées comme identités.
- **Statut :** besoin futur identifié.

---

# User Journey / Analytics

Le User Journey Analytics décrit l'usage d'EchoAtlas. Il reste distinct du Listening History,
qui décrit les écoutes musicales et alimente la navigation temporelle critique pour V1.

## Parcours sémantiques

- **Constat / besoin :** reconstruire des parcours tels que nœud A, relation R, nœud B afin de
  comprendre l'exploration.
- **Contraintes :** enregistrer des identités sémantiques stables, jamais des coordonnées comme
  identité fonctionnelle.
- **Statut :** modèle à concevoir; aucun tracking actuel.

## Événements orientés navigation

- **Constat / besoin :** les futurs signaux utiles concernent les chemins, découvertes et retours,
  plutôt qu'une métrique centrée uniquement sur le temps passé.
- **Contraintes :** ne pas injecter d'analytics dans Engine, Knowledge ou World.
- **Statut :** principe identifié.

## Stockage bêta local

- **Constat / besoin :** un stockage local peut suffire aux premières évaluations des parcours.
- **Contraintes :** consentement, confidentialité, effacement et séparation des données musicales;
  aucune synchronisation cloud implicite.
- **Statut :** option à évaluer.

## Indépendance du fournisseur analytics

- **Constat / besoin :** aucun fournisseur analytics ne doit être imposé par le moteur.
- **Contraintes :** une éventuelle intégration reste applicative et remplaçable; aucun état global
  dans Engine.
- **Statut :** contrainte architecturale future.

---

# Music Domain

## Genre et compilation dans une future version JSON

- **Constat / besoin :** Music supporte ces kinds, mais JSON V1 ne définit aucune collection ni
  endpoint pour eux.
- **Contraintes :** nouvelle version explicite du schéma, sans déduire les genres depuis les tags
  ni introduire de migration implicite.
- **Statut :** extension éventuelle.

---

# Data / Application

## Interface multilingue et localisation

- **Constat / besoin :** les textes de l'interface devront pouvoir être traduits indépendamment
  des noms et titres provenant des données musicales.
- **Contraintes :** ne modifier ni les IDs canoniques, ni le Knowledge Graph, ni le World, ni le
  déterminisme; conserver les textes UI dans la couche Application ou UI.
- **Statut :** besoin futur identifié, sans système i18n engagé.

## Exploitation de `metadata.seed`

- **Constat / besoin :** la première carte transmet explicitement la seed conservée par JSON Import
  à la génération du World.
- **Contraintes :** branchement explicite dans la couche Application; aucune metadata dans le
  Knowledge Graph.
- **Statut :** intégrée en Phase 10.

---

# Performance

## Renderer pour mondes plus grands

- **Constat / besoin :** le rendu cellule par cellule est accepté pour la fondation mais devra être
  mesuré avec des mondes plus grands.
- **Contraintes :** mesurer avant d'optimiser; préserver l'ordre des couches et l'immutabilité du
  World.
- **Statut :** évaluation future.

## Indexation, chunks et cache

- **Constat / besoin :** la roadmap prévoit spatial indexing, chunk loading, optimisation mémoire
  et caching pour les grandes bibliothèques.
- **Contraintes :** ne pas changer l'architecture ni introduire de cache global avant mesures.
- **Statut :** Phase 11 canonique, conception non engagée.
