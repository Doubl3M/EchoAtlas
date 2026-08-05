# CODE_STYLE.md

> EchoAtlas Coding Standards
>
> Version 1.0
>
> This document defines the permanent coding conventions of EchoAtlas.
>
> Every contributor, human or AI, must follow these rules.
>
> Consistency always wins over personal preference.

---

# Philosophy

Code is read far more often than it is written.

The primary objective is clarity.

The second objective is maintainability.

Performance comes only after correctness.

---

# General Principles

Write code that explains itself.

Prefer explicitness.

Avoid surprises.

Never be clever.

The best code is boring.

---

# TypeScript

Strict mode is mandatory.

```
strict = true
```

Never disable compiler rules.

Never use:

```
any
```

Never use:

```
@ts-ignore
```

Never silence compiler errors.

Fix them.

---

# Typing

Every public function has explicit types.

Example

```ts
function distance(a: Vector2, b: Vector2): number
```

Never rely on inferred public APIs.

Private variables may use inference when obvious.

---

# Immutability

Prefer immutable objects.

Use readonly whenever possible.

Example

```ts
class Album {

    constructor(

        public readonly id: string,

        public readonly title: string

    ) {}

}
```

Mutation must always be intentional.

---

# Naming

Names describe intent.

Never implementation.

Good

```
TerrainGenerator

WorldBuilder

KnowledgeGraph

CameraController
```

Bad

```
Generator2

Utils

Manager

DataProcessor

Thing
```

Avoid vague words.

Especially:

```
Utils

Common

Misc

Helpers

Temp

Data

Object
```

---

# Functions

One responsibility.

Small.

Predictable.

Target size

20 lines

Maximum

50 lines

Split instead of nesting.

---

# Parameters

Prefer

```
0–3 parameters
```

Beyond that,

introduce an object.

Example

```ts
createWorld(config)
```

Instead of

```ts
createWorld(seed,width,height,noise,water,...)
```

---

# Classes

A class owns one concept.

Maximum target

200 lines.

Beyond that,

split responsibilities.

---

# Interfaces

Interfaces describe contracts.

Classes implement behaviour.

Never create interfaces "just in case".

---

# Enums

Avoid enums when literal unions are sufficient.

Prefer

```ts
type TerrainType =
    | "mountain"
    | "forest"
    | "desert";
```

---

# Composition

Prefer composition.

Avoid inheritance.

Inheritance requires explicit justification.

---

# Comments

Good comments explain

WHY.

Bad comments explain

WHAT.

Bad

```ts
// increment i

i++;
```

Good

```ts
// Preserve deterministic ordering
```

---

# Formatting

Indentation

4 spaces

No tabs.

Maximum line length

100 characters.

One blank line between logical blocks.

No trailing whitespace.

Final newline required.

---

# Imports

Order

1. External packages

2. Internal modules

3. Relative imports

Alphabetical inside groups.

Never use wildcard imports.

Bad

```ts
import * as MathUtils
```

Good

```ts
import { Vector2 } from "./Vector2";
```

---

# Exports

Public API through barrel files.

Internal files remain internal.

Example

```
engine/

index.ts
```

---

# Folder Rules

Folders describe domains.

Never file types.

Good

```
terrain/

render/

knowledge/
```

Bad

```
classes/

interfaces/

helpers/
```

---

# Error Handling

Never ignore errors.

Bad

```ts
catch {}
```

Good

```ts
catch(error){

    logger.error(error);

}
```

Recoverable errors return Result objects.

Unexpected errors throw.

---

# Logging

No console.log in production code.

Logging goes through dedicated services.

---

# Constants

Magic numbers are forbidden.

Bad

```ts
height *= 0.37;
```

Good

```ts
const MOUNTAIN_GAIN = 0.37;
```

---

# Booleans

Positive names only.

Good

```
isVisible

hasRoad

canRender
```

Bad

```
notVisible

disableRoad
```

---

# Collections

Prefer Map over Object when keys are dynamic.

Prefer Set over arrays for uniqueness.

TypedArray whenever performance matters.

---

# Performance

Measure first.

Optimize later.

Never sacrifice readability without evidence.

---

# Memory

Avoid allocations inside render loops.

Reuse buffers.

Reuse vectors.

Pool objects only when profiling justifies it.

---

# Determinism

The same seed

must generate

the same world.

Always.

No dependence on:

time

hardware

fps

random browser state

locale

timezone

---

# Testing

Critical algorithms require tests.

Especially

noise

terrain

graph

geometry

world generation

Determinism is tested.

---

# Documentation

Public APIs are documented.

Internal implementation is documented only when necessary.

Avoid redundant comments.

---

# Git

One logical change

=

One commit.

Never mix

refactoring

and

feature development.

---

# Pull Requests

Small.

Focused.

Reviewable.

One objective.

---

# Forbidden

No mutable global state.

No circular dependency.

No duplicated algorithm.

No dead code.

No commented code.

No TODO without issue.

No hidden side effects.

No implicit conversions.

No silent failures.

---

# Definition of Clean Code

A file is considered clean when:

It has one responsibility.

Its intent is obvious.

Its public API is explicit.

Its dependencies are minimal.

Its behaviour is deterministic.

A new contributor understands it in less than five minutes.

---

# Final Rule

When hesitating between two implementations,

choose the one that a developer will still understand

five years from now.

EchoAtlas is written for longevity,

not for cleverness.