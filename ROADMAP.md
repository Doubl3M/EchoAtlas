# ROADMAP.md

> EchoAtlas Development Roadmap
>
> Version 1.0
>
> This document defines the official development roadmap of EchoAtlas.
>
> Until Version 1.0, this roadmap is considered locked.

---

# Vision

EchoAtlas is developed incrementally.

Each phase delivers a complete and usable foundation for the next one.

No phase may begin before the previous one is considered stable.

---

# Guiding Principles

The roadmap follows three priorities.

1. Build a stable engine.

2. Build a deterministic world.

3. Interpret music.

Never the opposite.

---

# Current Status

| Phase | Status |
|---------|--------|
| Phase 0 — Editorial Foundation | ✅ Complete |
| Phase 1 — Engine Foundation | ✅ Complete |
| Phase 2 — Math Engine | ✅ Complete |
| Phase 3 — Terrain Engine | ✅ Complete |
| Phase 4 — Knowledge Graph | ✅ Complete |
| Phase 5 — World Engine | ✅ Complete |
| Phase 6 — Camera | ✅ Complete |
| Phase 7 — Renderer | ✅ Complete |
| Phase 8 — Music Interpreter | ✅ Complete |
| Phase 9 — JSON Import | ✅ Complete |
| Phase 10 — First Navigable Map | ✅ Complete |
| Phase 11 — Optimization | ▶️ Next |
| Phase 12 — Version 1.0 | ⏳ Planned |

---

# Phase 0

## Editorial Foundation

Objective

Create the permanent documentation defining EchoAtlas.

Deliverables

- README
- Atlas documentation
- AGENTS
- ARCHITECTURE
- CODE_STYLE
- CONTRIBUTING
- Project conventions

Status

Completed.

Frozen except corrections.

---

# Official Technical Order

Until the first navigable map, development follows this order:

```
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

---

# Phase 1

## Foundation

Objective

Create a reusable software engine.

Deliverables

- Project structure
- Application lifecycle
- Engine modules
- TypeScript configuration
- Testing infrastructure

Exit Criteria

The engine starts.

Tests execute.

Architecture is stable.

No world generation or music support yet.

---

# Phase 2

## Math Engine

Objective

Create the deterministic mathematical foundations.

Deliverables

- Deterministic random generator
- Interpolation
- Geometry
- Vectors
- Matrices

Exit Criteria

Mathematical foundations are deterministic and tested.

---

# Phase 3

## Terrain Engine

Objective

Generate a believable procedural world.

Deliverables

- Value Noise
- Fractal Noise
- Domain Warp
- Height Maps
- Continents
- Coastlines
- Mountains
- Rivers
- Lakes

Exit Criteria

A complete world is generated from a seed.

---

# Phase 4

## Knowledge Graph

Objective

Represent meaning independently of music.

Deliverables

- Graph
- Nodes
- Edges
- Affinity
- Similarity
- Clustering

Exit Criteria

The graph exists independently of the renderer.

---

# Phase 5

## World Engine

Objective

Transform the Knowledge Graph and terrain into geography.

Deliverables

- Provinces
- Cities
- Routes
- Bridges
- Forests
- Ruins
- Ports
- Landmarks

Exit Criteria

The world becomes explorable.

Still contains no musical information.

---

# Phase 6

## Camera

Objective

Make generated worlds navigable.

Deliverables

- Camera
- Zoom
- Pan
- Selection

Exit Criteria

The camera can navigate a World without modifying it.

---

# Phase 7

## Renderer

Objective

Display the World using Engine primitives.

Deliverables

- Rendering bootstrap
- Layers
- Labels
- LOD
- Picking

Exit Criteria

Large worlds remain fluid.

---

# Phase 8

## Music Interpreter

Objective

Translate musical data into semantics.

Deliverables

- Metrics
- Artist relationships
- Album relationships
- Playlist interpretation

Exit Criteria

A Knowledge Graph can be produced.

---

# Phase 9

## JSON Import

Objective

Import and validate musical data.

Deliverables

- JSON parser
- Validation
- Normalization

Exit Criteria

Validated JSON can be passed to the Music Interpreter.

---

# Phase 10

## First Navigable Map

Objective

Connect the complete pipeline into an explorable application.

Deliverables

- Complete JSON to rendered World pipeline
- First displayed music map
- Music labels
- Pan
- Zoom
- Resize
- First functional spatial navigation

Exit Criteria

The complete pipeline produces a displayed music map with functional spatial navigation.

---

# Phase 11

## Optimization

Objective

Prepare large libraries.

Deliverables

- Spatial indexing
- Chunk loading
- Memory optimization
- Rendering optimization
- Caching

---

# Phase 12

## Version 1.0

Requirements

The application can:

- import music
- generate an atlas
- save a project
- reload a project
- explore the generated world

V1 Critical

- Temporal navigation
- A distinct listening-history model composed conceptually of Listening Events

Temporal navigation lets users explore how their musical atlas evolves over time. It is a
structuring product hypothesis for giving users a reason to revisit their atlas, to be validated
after delivery rather than treated as a demonstrated retention effect.

`MusicCatalog` remains the structural musical domain. Listening history represents events through
time and remains separate from the catalog and from User Journey Analytics. `listens` must not be
reintroduced into `MusicCatalog`.

Temporal reconstruction must be deterministic from explicit inputs. Generic layers must not gain
an implicit notion of the current time.

V1 Required

- Search
- Filters
- Contextual information and tooltips
- Statistics
- Layer controls

Everything else belongs to Version 2.

---

# Out of Scope

Until Version 1.0

No multiplayer.

No cloud synchronization.

No plugins.

No scripting.

No mobile application.

No collaborative editing.

No AI-assisted recommendations.

Ideas are collected.

Implementation waits.

---

# Roadmap Governance

This roadmap is intentionally conservative.

Features are added only when they help reaching Version 1.0.

Interesting ideas are not sufficient justification.

---

# Completion Rule

A phase is complete only when:

- code compiles;
- tests pass;
- documentation is updated;
- architecture remains consistent.

---

# Versioning

The project follows semantic versioning.

0.x

Development.

1.0

First stable release.

2.x

New capabilities.

Architecture changes after Version 1 only.

---

# Final Principle

The roadmap is a contract.

It protects the project against feature creep.

EchoAtlas reaches Version 1

before it dreams about Version 2.
