# CONTRIBUTING.md

> Contributing to EchoAtlas
>
> Thank you for contributing to EchoAtlas.
>
> This project is intended to become a long-term software engine.
> Every contribution should improve the project without compromising its architecture.

---

# Philosophy

EchoAtlas values consistency over speed.

A feature delivered one week later is acceptable.

A poor architectural decision is not.

Every contribution should leave the project cleaner than it was found.

---

# Before You Start

Read these documents completely.

```
README.md

AGENTS.md

ARCHITECTURE.md

CODE_STYLE.md
```

No contribution should be made before understanding these documents.

---

# Development Workflow

```
Issue

↓

Discussion (if necessary)

↓

Feature Branch

↓

Implementation

↓

Tests

↓

Documentation

↓

Pull Request

↓

Review

↓

Merge
```

Every contribution follows this workflow.

---

# Branch Strategy

```
main

↓

develop

↓

feature/*
```

Examples

```
feature/world-generator

feature/noise

feature/camera

feature/render-loop
```

Never commit directly to `main`.

---

# Commit Messages

EchoAtlas follows Conventional Commits.

Examples

```
feat(engine): add deterministic value noise

fix(renderer): correct viewport clipping

docs: update architecture

refactor(world): simplify province generation

test(math): add interpolation tests
```

Bad examples

```
update

fix

changes

work
```

---

# Pull Requests

A Pull Request should contain exactly one objective.

Good

```
Implement Value Noise
```

Bad

```
Noise + Camera + Refactor + Documentation
```

Small Pull Requests are easier to review.

---

# Review Checklist

Before opening a Pull Request, verify:

- Code compiles.
- Tests pass.
- Linter passes.
- Formatting is correct.
- Architecture rules are respected.
- Documentation is updated if required.
- Public API has been reviewed.

---

# Coding Rules

All contributions must follow:

- AGENTS.md
- ARCHITECTURE.md
- CODE_STYLE.md

No exceptions.

---

# Documentation

Documentation explains intent.

Code explains implementation.

Never duplicate information.

Whenever a public API changes, documentation must be updated in the same Pull Request.

---

# Testing

Critical systems require tests.

Especially:

- procedural generation
- geometry
- graph algorithms
- deterministic randomness
- terrain generation

Every deterministic algorithm must produce identical results for identical input.

---

# Determinism

The following inputs define a world:

- seed
- configuration
- music dataset

Nothing else.

A contribution breaking determinism cannot be merged.

---

# Performance

Optimize only after measurement.

Never sacrifice readability without profiling evidence.

Avoid allocations inside render loops.

Prefer deterministic algorithms.

---

# Public API

Changing a public API requires justification.

Backward compatibility is preferred whenever reasonable.

---

# Refactoring

Refactoring is encouraged.

However,

a refactoring Pull Request should not introduce new features.

One Pull Request.

One objective.

---

# Dependencies

Before adding a dependency, ask:

Does the standard library already solve this?

Can we implement it simply ourselves?

Will this dependency still be maintained in five years?

If one answer is uncertain,

do not add the dependency.

---

# Code Ownership

Every contributor owns the quality of the repository.

If a problem is discovered,

fix it or create an issue.

Never ignore technical debt intentionally.

---

# Reviews

Reviews are collaborative.

The objective is to improve the project,

not to defend personal code.

Disagreement is resolved through architecture,

not preference.

---

# Definition of Done

A contribution is complete only if:

✓ Feature implemented

✓ Tests passing

✓ Documentation updated

✓ Lint passing

✓ Formatting correct

✓ No architectural regression

✓ No unnecessary dependency

---

# Long-Term Vision

EchoAtlas is expected to evolve for many years.

Contributors should always choose solutions that remain understandable over time.

Short-term convenience must never compromise long-term maintainability.

---

# Final Principle

Every contribution should make EchoAtlas easier to understand,

easier to extend,

and easier to maintain.

If a contribution does not improve at least one of these qualities,

it should be reconsidered.