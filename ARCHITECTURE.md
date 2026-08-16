# ARCHITECTURE.md

> EchoAtlas Software Architecture
>
> Version 1.0
>
> This document describes the permanent software architecture of EchoAtlas.
> It defines responsibilities, dependencies and invariants.
>
> This architecture is considered stable until Version 1.0.

---

# Philosophy

EchoAtlas is divided into independent layers.

Each layer solves exactly one problem.

A module may depend only on the modules explicitly allowed below.

```
music      → knowledge, shared
knowledge  → shared
world      → knowledge, engine, shared
render     → world, engine, shared
ui         → render, shared
app        → music, knowledge, world, render, ui, engine, shared
engine     → shared
shared     → nothing
```

No inverse or circular dependency is allowed.

Rendering is an application module built on the Engine primitives.

It never owns the world.

---

# High Level Overview

```
Music Library

        │

        ▼

Music Interpreter

        │

        ▼

Knowledge Graph

        │

        ▼

World Generator

        │

        ▼

World Model

        │

        ▼

Renderer

        │

        ▼

Canvas
```

Every transformation is deterministic.

Given identical input:

the generated world must always be identical.

---

# Layer Responsibilities

## Application

Coordinates the software.

Responsibilities:

- application lifecycle
- dependency creation
- configuration
- startup
- shutdown

Never:

- generates terrain
- interprets music
- renders graphics

---

## Music

Transforms external data into semantic information.

Responsibilities:

- parse JSON
- validate schema
- compute listening metrics
- normalize data

Produces:

Knowledge Graph.

Never:

- generates geography.

---

## Knowledge

The semantic representation.

This layer contains no geography.

It manipulates only meaning.

Nodes.

Edges.

Weights.

Relationships.

Examples:

Artist

Album

Genre

Label

Listening Session

Playlist

Influence

Similarity

Affinity

No mountains.

No cities.

No forests.

---

## World

Transforms semantics into geography.

Responsibilities:

- continents
- districts
- buildings and their contents
- cities only after their currently unresolved generation rule is canonized
- roads
- rivers
- mountains
- landmarks

The World layer never reads music.

It only reads semantic structures.

World owns geographic containment. A geometry-free hierarchical foundation distinguishes spatial
features from non-spatial contents while preserving their optional Knowledge identities. It does
not encode Music kinds: product-specific semantic mappings are resolved before or through an
explicit World interpretation policy. The current `world-v1-exact` flat generator remains active
during this migration.

Music Atlas currently owns `music-geography-v1` in the application layer. This interpretation
uses the exact canonical structural Music relations V1: Genre `includes` Artist creates a District
in a Genre Continent, Artist `performed` Album creates a Building in every represented Artist
District, and Album `contains` Track creates Building Content in every represented Album Building.
Endpoint kinds alone are insufficient. Inverse, aliased and unrelated relations have no implicit
geographic meaning. This interpretation version is independent from both the JSON format version
and `WorldGenerationVersion`.

World provides a generic focus resolution step over this hierarchy. A Knowledge identity resolves
to zero or more direct features or content containers; no one-to-one representation is assumed.
When several representations exist, contextual selection compares containment ancestry rather than
spatial coordinates. This establishes the future flow `Knowledge identity → geographic
representation(s) → contextual geographic focus → layout → Camera`; the current showcase does not
yet consume it.

`GeographicLayout` is the separate immutable spatial snapshot of a hierarchy. Every
`GeographicFeatureId` has exactly one placement: a Region with an axis-aligned envelope and anchor,
or a Site with a logical World position. Region envelopes define containment and focus domains;
they are not promises that rendered borders are rectangular. Contents have no placement of their
own. Spatial focus resolves a geographic target to a Region anchor or Site position, without zoom,
viewport or Camera behavior.

`geographic-layout-v1` deterministically generates that layout from a hierarchy, a canonical
Math `Seed`, and logical World dimensions. Continents and Districts map to generic Regions;
Buildings map to Sites. Region siblings are recursively partitioned along the longest envelope
axis using their number of descendant Sites as structural weight, with a minimum weight of one for
empty Regions. Rectangles remain generation envelopes rather than visual borders. This version
rejects Site roots and mixed Region/Site siblings explicitly; those are algorithm-version limits,
not hierarchy or layout invariants.

The logical World extent and terrain resolution are separate explicit configuration inputs. World
owns the deterministic mapping from geographic coordinates to the generic terrain cell grid.
When Terrain is finer than the World, all cells remain renderable across the continuous visual
extent, although the historical WorldLocation domain `[0, dimension - 1]` may not sample cells next
to the exclusive visual boundary.

---

## Engine

Generic simulation engine.

Contains:

camera primitives

terrain

noise

events

selection

viewport

exploration mechanisms

The Engine has no knowledge of music.

The World decides geography.

The Engine provides the generic mechanisms required to produce and explore it.

---

## Render

Reads the World and uses Engine primitives.

It never modifies the World.

Application rendering exists only in `src/render/`.

Terrain cells are projected into logical World space through the canonical World mapping; the
Renderer does not decide how geographic locations obtain elevation.

There is no application renderer in `engine/`.

---

## UI

Manages the interface.

It contains no musical or geographic logic.

---

## Shared

Contains domain-independent contracts shared by modules.

It depends on no other module.

---

## Math

Lowest Engine module.

Contains only deterministic algorithms.

Examples:

PRNG

Noise

Interpolation

Geometry

Voronoi

Delaunay

Vectors

Matrices

No project logic.

---

# Directory Structure

```
src/
    app/
    music/
    knowledge/
    world/
    render/
    ui/
    engine/
        core/
        math/
        terrain/
        camera/
        interaction/
    shared/
```

Folders are permanent.

Adding a new root folder requires architectural justification.

---

# Dependency Rules

Allowed imports

```
music      → knowledge, shared
knowledge  → shared
world      → knowledge, engine, shared
render     → world, engine, shared
ui         → render, shared
app        → music, knowledge, world, render, ui, engine, shared
engine     → shared
shared     → nothing
```

All imports not listed above are forbidden.

Inverse and circular dependencies are forbidden.

Every dependency violating this rule is considered an architectural defect.

---

# World Generation Pipeline

```
Music JSON

↓

Validation

↓

Normalization

↓

Knowledge Graph

↓

Semantic Analysis

↓

Terrain Constraints

↓

World Generation

↓

Rendering
```

Every stage produces immutable data.

---

# Engine Pipeline

```
Initialize

↓

Load configuration

↓

Load data

↓

Build Knowledge Graph

↓

Generate World

↓

Initialize Renderer

↓

Main Loop
```

---

# Main Loop

```
Update Time

↓

Update Services

↓

Update Camera

↓

Update Selection

↓

Render Frame
```

World generation never happens inside the render loop.

---

# Services

Every service follows the same lifecycle.

```
initialize()

update(delta)

dispose()
```

Services never create each other.

Dependencies are injected.

---

# Data Ownership

Each object has exactly one owner.

Example:

```
World

 ├── Terrain

 ├── Continents

 ├── Districts

 └── Buildings
```

Renderer reads.

World owns.

---

# Events

Communication between distant systems must happen through events.

Never through global state.

---

# Determinism

For a non-temporal generation, the following explicit inputs define a world:

- seed
- configuration
- music dataset

Nothing else.

Changing hardware must never change the world.

Changing FPS must never change the world.

Changing operating system must never change the world.

## Temporal snapshots

`ListeningHistory` belongs to Music and is an immutable canonical sequence of explicit listening
facts. Each `ListeningEvent` carries its own stable ID, an explicit safe Unix epoch millisecond and
a canonical Music identity `(kind, ID)`. Input order has no meaning: events are ordered by
`occurredAt`, then by an explicit lexical comparison of event IDs. Equal timestamps represent
distinct facts when their IDs differ.

`History(T)` contains exactly events where `occurredAt <= T`. It is reconstructed directly from
the immutable history and never from a previous temporal snapshot. Neither the catalog nor the
system clock is required to construct the history; an event may therefore reference a Music
identity absent from the current catalog, for later resolution by temporal projection.

`temporal-music-presence-v1` projects `Presence(T)` from direct listening identities resolved in
the supplied catalog, then closes upward over exactly the same canonical structural relations:
Genre `includes` Artist, Artist `performed` Album and Album `contains` Track. Label, Playlist and
Compilation can be directly present but have no inherited structural presence in V1. The temporal
catalog retains every original relation whose two endpoints are present and invents none.

Presence answers which identities exist at `T`. `music-activity-v1` independently measures the
latest resolved activity at or before `T`. Direct Track, Album and Artist activity propagates to
all canonical structural ancestors; Label, Playlist and Compilation activity remains direct.
Only Artist activity is classified in V1: it is inactive after exactly 180 days without activity,
including at that boundary. This is the V1 product approximation of six months, not a calendar
duration. Other kinds expose only `lastActivityAt`.
Appearance remains a separate geographic/rendering concern. These three contracts are not
interchangeable: an inactive Artist is still present whenever Presence(T) contains it.

```text
ListeningHistory → Presence(T)
ListeningHistory → Activity(T)
Presence(T) + Activity(T) → future Appearance(T)
```

Activity reconstruction has no system clock, previous-snapshot input, CurrentBroadcast input,
World dependency or rendering effect.

World owns a generic immutable `GeographicAppearanceSnapshot`. It is sparse: absence means the
default `normal` condition, while V1 stores only non-default `ruined` appearances for verified
features in a supplied `GeographicHierarchy`. Appearance contains no time calculation or Music
semantics and never replaces a feature identity.

The application policy `music-geographic-appearance-v1` maps an inactive Artist through its
canonical Knowledge Node ID to every represented District and marks those Districts `ruined`.
Active Artists and every other Music kind produce no non-default appearance. The current Artist →
City Canvas landmark remains showcase compatibility only and is deliberately not an Appearance
target. JSON V1 still imports no Genre; the showcase composes it with a separate explicit demo-only
Music catalog declaring five Genres and their `includes` relations. No tag, name or attribute is
analyzed. The temporal runtime now generates the canonical hierarchy, layout and Appearance from
that complete catalog while the established flat World remains a Renderer compatibility path.
The isolated semantic preview is development tooling only. Its SVG envelopes and composition make
the hierarchy inspectable; they are not a public Render API or a prescribed future appearance for
Continents and Districts.

The browser showcase now exercises this boundary through the application layer:

```text
ListeningHistory
→ Presence(T)
→ Activity(T)
→ KnowledgeGraph(T)
→ GeographicWorld(T)
→ CanvasRenderer
```

Until the hierarchical geography is rendered, the application uses an explicit legacy bridge:
inactive Artists receive only a generic `weathered` label treatment and a Music-panel annotation.
It does not alter City geometry and does not mean that the legacy City is a ruined District.

```text
Temporal catalog(T)
├── legacy catalog adapter → GeographicWorld → current Canvas
└── MusicGeographicInterpreter → GeographicHierarchy
    → geographic-layout-v1 → GeographicLayout
    → music-geographic-appearance-v1 → GeographicAppearanceSnapshot
```

Changing the explicit historical milestone rebuilds every derived snapshot from the immutable full
catalog and history. It does not mutate the source catalog, reuse the previous World as input, or
alter Camera state. `CurrentBroadcast` remains separate application state and is not rewound.

A temporal world is defined conceptually by:

```text
MusicCatalog
+ ListeningHistory up to T
+ seed
+ temporal rules version
+ WorldConfig
→ World(T)
```

`T` is an explicit input. No generic layer may derive it implicitly from the system clock, a notion
of "now" or the user's navigation path. Direct access to `T` and a later return to `T` must
reconstruct exactly the same snapshot from identical inputs.

Determinism applies to each `World(T)`. It does not require identical coordinates, routes or regions
between `T1` and `T2`, nor compatibility with layouts produced by a different algorithm version.
Algorithm and temporal-rule versions must be explicit or traceable whenever reproducibility across
versions requires them.

`WorldConfig` contains the `WorldGenerationVersion`, logical dimensions, `TerrainConfig` and current
explicit placement parameters. `WorldConfig.generationVersion` identifies the observable geographic
generation physics. Its current value, `world-v1-exact`, resolves to the established exact placement
without exposing indexed buffers or other implementation details. It is distinct from
`metadata.version`, which versions the imported JSON format. A future project format must persist
the World configuration needed to reconstruct historical snapshots.

Inside World, `WorldGenerator` creates canonical initial positions and resolves the generation
version to a private placement strategy. Placement strategies receive only canonical IDs,
relations, initial numeric buffers, logical dimensions and explicit placement parameters. They are
not part of the public World API.

A future placement optimization may therefore change the layout. It must preserve the seed,
contractual canonical ordering, relation semantics, immutable snapshots, the Knowledge/World
boundary, Renderer independence and reproducibility for a given `World(T)`. Exact coordinates from
the current algorithm are regression references for that implementation, not a permanent public
contract.

## Current broadcast

The current broadcast is application-owned experience state and is explicitly outside `World(T)`.
Historical navigation changes only the temporal Atlas snapshot; it does not rewind or reconstruct
the broadcast. Conversely, changing the current broadcast does not modify `MusicCatalog`, the
Knowledge Graph, geographic hierarchy or generated World.

A broadcast entry is an autonomous display description with a broadcast-local stable identity,
track title, artist display name and explicit provenance. An optional Music identity may link a
known entry, but neither Music nor geographic adoption is required. Broadcast order is preserved
as supplied rather than canonically sorted. Representation never creates a `MusicEntity`,
`KnowledgeNode`, `GeographicFeature`, `WorldLocation`, `WorldConnection` or implicit Listening
Event. A future accepted listening event requires a separate explicit workflow.

---

# Public API

Internal implementation may change.

Public interfaces must remain stable.

The Engine exposes modules.

Not implementation details.

---

# Error Handling

Recoverable errors

↓

Result objects

Unexpected errors

↓

Exceptions

Never ignore errors silently.

---

# Performance Rules

Correctness first.

Readability second.

Performance third.

Optimizations require measurements.

Never assumptions.

---

# Rendering Rules

Renderer never modifies the world.

Renderer never generates geometry.

Renderer never computes terrain.

Renderer only visualizes.

---

# Testing Strategy

Math

100% deterministic.

Knowledge

Pure unit tests.

World

Golden seed tests.

Renderer

Visual regression tests.

---

# Extension Principle

Future projects may replace the Music Interpreter.

The Engine must remain reusable.

Possible future interpreters:

Books

Movies

Games

Photography

Travel

Personal Journals

Only the Interpreter changes.

The Engine remains identical.

---

# Architectural Invariants

These rules are permanent.

The Engine never knows music.

The Renderer never owns data.

The World never parses JSON.

The Knowledge Graph contains no geography.

Math remains independent.

Every transformation is deterministic.

Every layer has one responsibility.

These principles define EchoAtlas.

Breaking one of them requires a new major version.
