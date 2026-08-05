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
| Phase 1 — Engine Foundation | 🔄 In Progress |
| Phase 2+ | ⏳ Planned |

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

# Phase 1

## Engine Foundation

Objective

Create a reusable software engine.

Deliverables

- Project structure
- Application lifecycle
- Engine modules
- TypeScript configuration
- Testing infrastructure
- Rendering bootstrap
- Deterministic random generator
- Mathematical foundations

Exit Criteria

The engine starts.

Tests execute.

Architecture is stable.

No music support yet.

---

# Phase 2

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

# Phase 3

## World Engine

Objective

Transform terrain into geography.

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

# Phase 4

## Rendering Engine

Objective

Display the world interactively.

Deliverables

- Camera
- Zoom
- Pan
- Selection
- Layers
- Labels
- LOD
- Picking

Exit Criteria

Large worlds remain fluid.

---

# Phase 5

## Knowledge Engine

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

# Phase 6

## Music Interpreter

Objective

Translate musical data into semantics.

Deliverables

- JSON parser
- Validation
- Metrics
- Listening history
- Artist relationships
- Album relationships
- Playlist interpretation

Exit Criteria

A Knowledge Graph can be produced.

---

# Phase 7

## Geographic Interpretation

Objective

Convert semantics into geography.

Examples

Artist

↓

City

Album

↓

Building

Affinity

↓

Road

Obsession

↓

Mountain

Discovery

↓

Port

Abandon

↓

Ruin

Exit Criteria

A complete atlas can be generated.

---

# Phase 8

## User Experience

Objective

Create an explorable application.

Deliverables

- Search
- Filters
- Tooltips
- Statistics
- Time navigation
- Layer controls

---

# Phase 9

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

# Phase 10

## Version 1.0

Requirements

The application can:

- import music
- generate an atlas
- save a project
- reload a project
- explore the generated world

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