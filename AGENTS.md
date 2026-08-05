# AGENTS.md

> EchoAtlas Development Contract
>
> This document defines the permanent rules that every coding agent, contributor or AI assistant must follow.
>
> It has priority over convenience.
> It has priority over speed.
> It has priority over new ideas.

---

# Mission

EchoAtlas is not a map generator.

EchoAtlas is an engine capable of transforming a lifetime of exploration into a coherent and explorable world.

Music Atlas is the first implementation of this engine.

The engine itself must remain domain agnostic.

---

# Vision

The project must be built as a long-term software product.

The goal is not to ship quickly.

The goal is to build software that remains understandable ten years from now.

Every architectural decision must increase clarity.

Never complexity.

---

# Golden Rule

A feature is finished only if:

- it compiles;
- it is documented when necessary;
- it is tested when applicable;
- it does not degrade architecture;
- it can be maintained.

---

# Non Goals

Do not optimize prematurely.

Do not add features because they are interesting.

Do not invent functionality outside the roadmap.

Do not redesign the project once Phase 1 has started.

---

# Roadmap Lock

Until Version 1.0:

No architectural pivot is allowed.

No redesign is allowed.

No experimental subsystem is allowed.

Ideas are welcome.

Implementation waits.

---

# Architectural Layers

Application

↓

Engine

↓

Knowledge Graph

↓

World

↓

Renderer

↓

UI

Dependencies may only point downward.

Never upward.

---

# Engine Principle

The Engine never knows music.

The Engine manipulates:

- nodes
- edges
- weights
- geometry
- terrain
- rendering

Music belongs to the Interpreter.

---

# Transformation Pipeline

Music JSON

↓

Knowledge Graph

↓

Semantic World

↓

Geographic World

↓

Rendered World

Every layer has exactly one responsibility.

---

# Core Principles

Single Responsibility.

Composition over inheritance.

Immutable by default.

Readonly everywhere possible.

Pure functions whenever possible.

Dependency Injection when useful.

No global state.

No singleton unless explicitly justified.

---

# TypeScript Rules

Strict mode mandatory.

No any.

No implicit any.

No ts-ignore.

Prefer explicit types.

Interfaces describe contracts.

Classes implement behaviour.

Enums only when justified.

---

# File Rules

One responsibility per file.

Small files are preferred.

Large classes must be split.

No circular dependency.

Barrel exports only at module level.

---

# Folder Structure

src/

app/

engine/

music/

render/

ui/

shared/

tests/

No additional root folders without justification.

---

# Engine Modules

core

math

terrain

world

render

interaction

Each module owns its API.

Internal implementation remains private.

---

# Knowledge Graph

Everything starts here.

Albums are not mountains.

Artists are not cities.

Those are geographical interpretations.

The graph stores only meaning.

---

# Rendering

Rendering never computes world logic.

Rendering only displays state.

No gameplay logic.

No terrain generation.

No semantic decisions.

---

# Performance

Avoid allocations inside render loops.

Prefer typed arrays.

Measure before optimizing.

Never sacrifice readability for hypothetical performance.

---

# Git Workflow

main

↓

develop

↓

feature branches

Small commits.

Meaningful commit messages.

No direct commits to main.

---

# Commit Convention

feat:

fix:

refactor:

docs:

test:

build:

chore:

Conventional Commits only.

---

# Documentation

Documentation describes intent.

Code describes implementation.

Never duplicate.

---

# Tests

Critical algorithms must be tested.

Procedural generation must be deterministic.

Same seed.

Same world.

Always.

---

# Forbidden

No hidden magic.

No implicit behaviour.

No mutable globals.

No duplicated algorithms.

No dead code.

No commented-out code.

No TODO left without issue reference.

---

# Definition of Done

A task is Done when:

✓ Code compiles

✓ Tests pass

✓ Architecture respected

✓ Documentation updated if needed

✓ Public API reviewed

---

# Decision Rule

When multiple implementations are possible:

Choose

1. Simplicity

2. Readability

3. Determinism

4. Performance

In this exact order.

---

# Long Term Objective

EchoAtlas must become an engine capable of representing exploration.

Music Atlas is only its first world.

Never forget:

We are building an engine.

Not a demo.

Not a visualization.

Not a one-shot project.