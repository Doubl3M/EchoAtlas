# 07 · Development Principles

> *Le code construit le Monde.*
>
> *Les principes garantissent qu'il pourra encore évoluer dans dix ans.*

---

# Objectif

Ce document définit les principes de développement de Music Atlas.

Ils constituent les règles de conception du code source.

Ils ne décrivent pas une implémentation.

Ils définissent la manière dont toute implémentation doit être pensée.

Ces principes s'appliquent à l'ensemble du projet, indépendamment du langage, du framework ou du moteur graphique utilisés.

---

# Principe 1 · Le Monde avant l'interface

Le Monde est la source de vérité.

L'interface n'est qu'une représentation.

Le moteur doit pouvoir fonctionner sans interface graphique.

La génération d'un atlas ne dépend jamais d'un navigateur.

---

# Principe 2 · Le déterminisme

Le moteur doit produire exactement le même résultat à partir des mêmes données.

Cela implique :

- une seed unique ;
- un générateur pseudo-aléatoire déterministe ;
- aucun appel à `Math.random()` dans le moteur ;
- aucune dépendance au temps système pendant la génération.

Le déterminisme est indispensable pour :

- reproduire un atlas ;
- déboguer le moteur ;
- comparer deux versions.

---

# Principe 3 · Une responsabilité par module

Chaque module possède une mission unique.

Exemples :

- importer des données ;
- calculer un relief ;
- dessiner une ville ;
- gérer la caméra.

Un module ne doit jamais remplir plusieurs rôles.

---

# Principe 4 · Le moteur ignore le rendu

Le moteur ne connaît :

- ni Canvas ;
- ni WebGL ;
- ni SVG ;
- ni HTML.

Il produit uniquement un modèle du Monde.

Le rendu interprète ce modèle.

Cette séparation permet de remplacer totalement le moteur graphique.

---

# Principe 5 · Les données sont immuables

Les données importées ne sont jamais modifiées.

Toutes les transformations produisent de nouveaux objets.

Cette approche facilite :

- les tests ;
- le débogage ;
- l'historique ;
- les comparaisons.

---

# Principe 6 · Les transformations sont explicites

Chaque étape possède :

- une entrée ;
- un traitement ;
- une sortie.

Les effets de bord doivent être évités.

Une fonction qui modifie le Monde doit annoncer clairement son intention.

---

# Principe 7 · La lisibilité prime

Le code est écrit pour être relu.

Avant toute optimisation, une question doit être posée :

> Un nouveau développeur comprendra-t-il cette fonction dans six mois ?

Si la réponse est non,

la fonction doit être simplifiée.

---

# Principe 8 · Les performances sont progressives

Le moteur privilégie d'abord :

- la justesse ;
- la stabilité ;
- la compréhension.

Les optimisations interviennent uniquement lorsqu'un problème réel est identifié.

Aucune optimisation prématurée.

---

# Principe 9 · Tout est testable

Toute logique métier doit pouvoir être exécutée sans interface graphique.

Les tests unitaires doivent pouvoir couvrir :

- la génération ;
- les transformations ;
- les règles du Monde.

---

# Principe 10 · Les modules communiquent par contrat

Les modules échangent des objets clairement définis.

Jamais des structures implicites.

Toute modification d'un contrat doit être documentée.

---

# Principe 11 · Les dépendances vont dans une seule direction

Une dépendance ne remonte jamais.

```
Data

↓

Knowledge Graph

↓

Interpretation

↓

World

↓

Renderer

↓

UI
```

Cette règle est absolue.

---

# Principe 12 · Le code raconte une histoire

Le code doit refléter le vocabulaire de l'Atlas.

Préférer :

```
Mountain

Port

Province

KnowledgeGraph

InterpretationEngine
```

à :

```
Node1

ItemManager

DataProcessor2

Stuff

Utils2
```

Le langage du code est celui du Monde.

---

# Principe 13 · Les règles métier sont centralisées

Les lois du Monde ne doivent jamais être dispersées.

Exemple :

La règle de création d'une montagne doit exister à un seul endroit.

Toute duplication crée un risque d'incohérence.

---

# Principe 14 · Les objets sont autonomes

Chaque objet possède les comportements qui lui appartiennent.

Une montagne connaît son altitude.

Une ville connaît ses bâtiments.

Une route connaît ses connexions.

Éviter les classes "Dieu" qui savent tout faire.

---

# Principe 15 · Les noms sont importants

Un bon nom réduit le besoin de commentaires.

Préférer :

```
generateMountain()

updateProvince()

findNearestPort()
```

à :

```
doThing()

calculate()

update()
```

Nommer, c'est documenter.

---

# Principe 16 · La documentation évolue avec le code

Toute évolution importante du moteur implique une mise à jour de la documentation.

Le code et l'Atlas doivent rester cohérents.

---

# Principe 17 · L'utilisateur ne doit jamais percevoir la complexité

Le moteur peut être sophistiqué.

L'expérience utilisateur doit rester simple.

Chaque interaction doit sembler naturelle.

---

# Principe 18 · Les fonctionnalités enrichissent le Monde

Avant d'ajouter une fonctionnalité, une question doit être posée :

> Rend-elle le Monde plus vivant ?

Si la réponse est non,

la fonctionnalité doit être reconsidérée.

---

# Checklist avant chaque Pull Request

- [ ] Le code respecte les lois du Monde.
- [ ] Le résultat est déterministe.
- [ ] Les tests passent.
- [ ] Les noms sont explicites.
- [ ] Aucun effet de bord inutile.
- [ ] La documentation est à jour.
- [ ] Le moteur reste indépendant du rendu.
- [ ] Les responsabilités sont clairement séparées.
- [ ] Les performances n'ont pas été privilégiées au détriment de la lisibilité.

---

# Conclusion

Le code de Music Atlas n'a pas pour vocation de démontrer une maîtrise technique.

Il a pour vocation de donner vie à un Monde.

Chaque ligne doit être écrite avec cette idée en tête.

---

> *Le meilleur code est celui qui laisse toute la place au paysage.*