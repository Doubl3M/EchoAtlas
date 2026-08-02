# 05 · The Engine

> *Le Monde n'est pas dessiné.*
>
> *Il émerge.*

---

# Objectif

Le World Engine est le cœur de Music Atlas.

Son rôle n'est pas de dessiner une carte.

Son rôle est de transformer une histoire musicale en un territoire cohérent.

Il reçoit des données.

Il produit une géographie.

Entre les deux, il interprète.

Le moteur n'est donc pas un moteur graphique.

Il est un moteur d'interprétation.

---

# Une transformation

Le moteur ne convertit jamais directement une donnée en un objet.

Le processus est plus profond.

```
Données

↓

Relations

↓

Signification

↓

Géographie

↓

Monde
```

Les données ne sont que de la matière première.

Le sens provient des relations entre elles.

---

# Les quatre couches

Le World Engine est composé de quatre niveaux.

```
                Monde visible
────────────────────────────────────

      Géographie

────────────────────────────────────

      Interprétation

────────────────────────────────────

      Données
```

Chaque couche ignore les détails des autres.

Cette séparation permet au moteur d'évoluer sans remettre en cause les lois du Monde.

---

# Les données

Les données décrivent uniquement des faits.

Exemples :

- un album ;
- un artiste ;
- une date ;
- un nombre d'écoutes ;
- une note ;
- un label ;
- une playlist.

Elles ne possèdent aucune signification géographique.

Le moteur refuse toute logique métier dans cette couche.

---

# Les relations

Le moteur construit ensuite un réseau de relations.

Exemples :

- proximité entre artistes ;
- fidélité à une œuvre ;
- périodes d'écoute ;
- découvertes successives ;
- collaborations ;
- influences.

Ce réseau constitue la mémoire musicale.

Il est invisible.

Mais il gouverne tout.

---

# L'interprétation

Le moteur interprète ensuite ces relations.

Exemples :

Une fidélité durable

↓

Montagne

Une découverte récente

↓

Port

Une œuvre interrompue

↓

Marais

Une passion instantanée

↓

Volcan

Cette couche applique le langage cartographique défini dans l'Atlas.

---

# La géographie

Lorsque toutes les significations sont connues,

le moteur peut construire le paysage.

Il génère :

- les continents ;
- les reliefs ;
- les villes ;
- les routes ;
- les cours d'eau ;
- les forêts ;
- les bâtiments.

Aucune décoration n'est créée.

Chaque élément possède une origine identifiable.

---

# L'évolution

Le Monde ne se régénère jamais entièrement.

Le moteur applique uniquement les transformations nécessaires.

Nouvelle écoute

↓

évolution locale

Nouvel album

↓

extension locale

Réécoute

↓

renforcement

Abandon

↓

érosion progressive

Le paysage évolue comme un organisme vivant.

---

# Les couches temporelles

Le moteur distingue trois temporalités.

## L'instant

Ce qui vient de se produire.

Exemple :

Une découverte.

---

## L'habitude

Ce qui se répète.

Exemple :

Les réécoutes.

---

## La mémoire

Ce qui résiste.

Exemple :

Les œuvres fondatrices.

Ces trois temporalités interagissent constamment.

---

# Les invariants

Le moteur garantit toujours :

- le déterminisme ;
- la cohérence ;
- la reproductibilité ;
- la continuité ;
- la lisibilité.

Aucune optimisation ne peut remettre en cause ces principes.

---

# Les modules

Le moteur est composé de plusieurs systèmes spécialisés.

```
Import Engine

↓

Knowledge Graph

↓

Interpretation Engine

↓

Geography Engine

↓

Evolution Engine

↓

Rendering Engine
```

Chaque module possède une responsabilité unique.

Ils communiquent par des modèles de données clairement définis.

---

# Le Knowledge Graph

Avant toute génération,

le moteur construit un graphe.

Ce graphe représente les relations musicales.

Il constitue la véritable connaissance du Monde.

La géographie n'est qu'une conséquence de ce graphe.

Autrement dit,

le paysage est une visualisation d'un réseau de mémoire.

---

# La génération

La génération se déroule toujours dans le même ordre.

1. Validation des données.

2. Construction du graphe.

3. Analyse des relations.

4. Traduction cartographique.

5. Construction de la géographie.

6. Simulation de l'évolution.

7. Génération finale du Monde.

Chaque étape est indépendante.

---

# Les responsabilités

Le World Engine ne connaît :

- ni Canvas ;
- ni WebGL ;
- ni SVG ;
- ni HTML.

Il produit uniquement un Monde.

Le rendu appartient à un autre système.

Cette séparation est fondamentale.

---

# Une architecture durable

Le moteur doit pouvoir évoluer pendant plusieurs années.

Ajouter un nouveau type de paysage ne doit jamais nécessiter la réécriture du moteur.

Ajouter une nouvelle donnée musicale ne doit jamais casser les paysages existants.

Le moteur privilégie l'extensibilité à la complexité.

---

# La finalité

Le World Engine ne cherche pas à représenter fidèlement des données.

Il cherche à raconter fidèlement une exploration.

C'est cette nuance qui fait de Music Atlas un atlas plutôt qu'une visualisation.

---

> *Les données racontent ce qui s'est passé.*

> *Le World Engine raconte ce que cela a construit.*