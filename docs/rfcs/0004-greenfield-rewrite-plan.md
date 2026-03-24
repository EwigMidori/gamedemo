# RFC-0004: Greenfield Rewrite Plan

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC defines a direct rewrite plan for building the project as a `pnpm workspace` composed of a host plus interoperable mods.

The current codebase is reference material only. It is not a compatibility target, not a migration substrate, and not a package boundary map.

## Rewrite Principles

- build the new architecture as a new workspace structure
- use the current codebase only to extract gameplay requirements and asset references
- do not preserve legacy module shapes
- do not optimize for incremental adaptation of old scene code
- validate architecture through playable slices in the new runtime
- apply RFC-0007 coding constraints to package APIs and file organization

## Reference-Only Policy For Legacy Code

The existing code may be used for:

- gameplay behavior reference
- content reference
- UI and input reference
- save semantics reference where still desired

The existing code must not dictate:

- package boundaries
- runtime contracts
- mod APIs
- host responsibilities
- naming of new modules unless still justified

## Target End State

The repository boots from `apps/host-web`, assembles runtime from selected workspace mods, and optionally loads player-authored external mods using the same install contract.

## Rewrite Phases

## Phase 0: Workspace Skeleton

### Tasks

- add `pnpm-workspace.yaml`
- create `apps/`, `packages/`, and `mods/`
- create root TypeScript and package baselines
- create `apps/host-web` as the only executable entrypoint

### Deliverable

- empty but buildable workspace skeleton

## Phase 1: Core Contracts

### Tasks

- create `packages/engine-core`
- create `packages/mod-api`
- define manifest, install context, runtime assembly contracts
- define namespaced ID policy and package conventions

### Deliverable

- stable contracts for host and mod authors

## Phase 2: Host Runtime

### Tasks

- create `packages/engine-runtime`
- create `packages/engine-content`
- create `packages/engine-phaser`
- create `packages/mod-loader`
- implement runtime container, dependency graph assembly, and boot sequencing

### Deliverable

- host can assemble and boot an empty runtime from selected mods

## Phase 3: First Playable Core Slice

### Tasks

- create `mods/core-base`
- create `mods/core-worldgen`
- create `mods/core-ui-hud`
- implement minimal world boot, player presence, camera, and HUD shell

### Deliverable

- a running session with no legacy scene dependencies

## Phase 4: Gameplay Core Mods

### Tasks

- create `mods/core-survival`
- create `mods/core-building`
- create `mods/core-crafting`
- implement content, systems, commands, and actions as mod contributions

### Deliverable

- a playable core loop built entirely from mods

## Phase 5: Vanilla Bundle

### Tasks

- create `mods/vanilla-bundle`
- define it as a composition mod depending on core gameplay mods
- move vanilla-specific content and balancing into the bundle or its direct dependencies

### Deliverable

- the default game is represented as a mod set, not host code

## Phase 6: Save And Profile Layer

### Tasks

- create `packages/save-schema`
- define save envelope, mod-scoped payloads, runtime profile recording, and migrations

### Deliverable

- host can persist and reload sessions for a selected mod profile

## Phase 7: External Player Mods

### Tasks

- support external ESM mod packages
- validate manifests, dependencies, and API compatibility
- add player-facing mod profile selection and enablement UX

### Deliverable

- players can load their own mods through the same core contract

## First Rewrite Order

Implementation should begin in this order:

1. workspace skeleton
2. `mod-api`
3. `engine-core`
4. `engine-runtime`
5. `engine-content`
6. `engine-phaser`
7. `core-base`
8. `core-worldgen`
9. `core-ui-hud`
10. gameplay core mods
11. `vanilla-bundle`
12. external mod support

## Definition Of Done

The rewrite is considered architecturally successful when:

- the host contains no vanilla gameplay rules
- the default game boots from a declared mod set
- mods depend on each other through manifests and install contracts
- external mods use the same contract as workspace mods
- runtime assembly is deterministic and instance-scoped
- no critical gameplay path depends on legacy `src/game/*` modules

## What Not To Do

- do not port `MainScene` and call that progress
- do not recreate global registries and rename them as services
- do not keep unnamespaced content IDs
- do not let old file layout determine workspace package layout
- do not treat dynamic external mods as a separate plugin architecture
