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
- provinces
- cities
- roads
- rivers
- mountains
- landmarks

The World layer never reads music.

It only reads semantic structures.

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

 ├── Provinces

 ├── Cities

 └── Roads
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

A temporal world is defined conceptually by:

```text
MusicCatalog
+ ListeningHistory up to T
+ seed
+ temporal rules
+ generation algorithm version
→ World(T)
```

`T` is an explicit input. No generic layer may derive it implicitly from the system clock, a notion
of "now" or the user's navigation path. Direct access to `T` and a later return to `T` must
reconstruct exactly the same snapshot from identical inputs.

Determinism applies to each `World(T)`. It does not require identical coordinates, routes or regions
between `T1` and `T2`, nor compatibility with layouts produced by a different algorithm version.
Algorithm and temporal-rule versions must be explicit or traceable whenever reproducibility across
versions requires them.

A future placement optimization may therefore change the layout. It must preserve the seed,
contractual canonical ordering, relation semantics, immutable snapshots, the Knowledge/World
boundary, Renderer independence and reproducibility for a given `World(T)`. Exact coordinates from
the current algorithm are regression references for that implementation, not a permanent public
contract.

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
