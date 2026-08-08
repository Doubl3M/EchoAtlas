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

Use `npm run test:run` for the Vitest suite and `npm run test:e2e` for the separate local
Chrome/Puppeteer browser smoke test. Puppeteer is development tooling, not an application
dependency.

Use `npm run benchmark` for the separate Phase 11 performance baseline. It measures deterministic
synthetic libraries through import, Knowledge Graph construction, World generation and an
instrumented Renderer surface. It does not measure browser Canvas painting, interaction latency or
end-user hardware. Compare results only on the same machine and runtime: Node timing, JIT and
garbage collection make cross-machine memory and duration comparisons non-equivalent.

Each timing is an independent experiment with two unreported warmups followed by five measured
runs. The report shows the median and the observed minimum/maximum; the complete pipeline is timed
directly and is never reconstructed by adding stage medians. A fixed-terrain placement series
varies only graph size, while a fixed-graph terrain series varies only HeightField dimensions.

The non-normative development baseline uses `small` (40 entities), `medium` (160) and `large`
(480) fixtures, with proportionally growing relations and terrain dimensions. These sizes expose
growth without defining V1 capacity limits or performance budgets. Heap deltas are directional
indicators collected after an explicit pre-run garbage collection, not absolute object sizes. The
initial reference environment is macOS Monterey 12.7.6 on x86_64 with Node v22.23.2; it is not a
minimum supported configuration. JIT and garbage collection remain sources of variance, and heap
figures are not absolutely comparable between passages.

`npm run benchmark:world-scaling` isolates graph-size growth in `WorldGenerator` on a fixed 64×48
terrain. Phase 11 uses three approximate development workloads for before/after comparisons:

| Workload | Reference size | Purpose |
|---|---:|---|
| Representative | ≈ 1,000 KnowledgeNodes | Routine Phase 11 comparison |
| Heavy | ≈ 5,000 KnowledgeNodes | Projected or explicitly forced heavy campaign |
| Stress | ≈ 10,000 KnowledgeNodes | Projected or explicitly forced stress campaign |

Synthetic fixtures use approximately 1.5 relations per node. These workloads are measurement
references only: they are not user limits, supported maxima, V1 exit criteria, performance budgets
or product promises. The command measures 250, 500, 1,000 and 2,000 nodes progressively, then uses
the stable large-tier `time / n²` coefficient to project Heavy and Stress. A benchmark-only guard
skips a target when its projected repeated campaign exceeds 30 seconds. Explicit investigation may
override that protection with `npm run benchmark:world-scaling -- --force-targets`; ordinary runs
must prefer projections when the current implementation would make repetitions disproportionate.

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
