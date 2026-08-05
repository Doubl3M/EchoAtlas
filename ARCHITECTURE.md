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

A layer may depend only on lower layers.

A lower layer never depends on a higher one.

```
Application
      │
      ▼
Knowledge
      │
      ▼
World
      │
      ▼
Engine
      │
      ▼
Math
```

Rendering is a service of the Engine.

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

camera

renderer

terrain

noise

events

selection

viewport

render loop

The Engine has no knowledge of music.

---

## Math

Lowest layer.

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

    engine/

        core/

        math/

        terrain/

        render/

        interaction/

    ui/

    shared/

tests/

docs/
```

Folders are permanent.

Adding a new root folder requires architectural justification.

---

# Dependency Rules

Allowed

```
Application

↓

Music

↓

Knowledge

↓

World

↓

Engine

↓

Math
```

Forbidden

```
Math

↓

World
```

Forbidden

```
Renderer

↓

Music
```

Forbidden

```
Terrain

↓

Album
```

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

The following inputs define a world:

- seed
- configuration
- music dataset

Nothing else.

Changing hardware must never change the world.

Changing FPS must never change the world.

Changing operating system must never change the world.

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