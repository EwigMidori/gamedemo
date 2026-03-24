# RFC-0001: Workspace And Host Architecture

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This project will be rewritten as a `pnpm workspace` built around a host runtime plus a set of interoperable mods. The game is no longer treated as a single application with optional plugins. Instead, the game is the composition result of:

- a thin host
- engine/runtime packages
- core mods
- optional first-party mods
- optional player-loaded mods

## Decision

The architecture will use two layers:

1. Host layer
   Owns app boot, rendering bridge, asset loading, persistence container, security boundaries, and mod loading.
2. Mod layer
   Owns gameplay rules, content, commands, HUD contributions, and world behavior.

The host must not contain vanilla gameplay rules.

## Why

The current codebase already wants mod extensibility, but the runtime is still effectively a monolith:

- gameplay rules live in scene code
- content is half runtime registry and half static constants
- command registration is global and process-wide
- mods are loaded into a world model they do not truly own

That structure cannot scale into "a set of core mods that build a rich world together".

## Workspace Layout

The repository should move toward a shape similar to:

```text
.
├─ apps/
│  └─ host-web/
├─ packages/
│  ├─ engine-core/
│  ├─ engine-runtime/
│  ├─ engine-content/
│  ├─ engine-phaser/
│  ├─ mod-api/
│  ├─ mod-loader/
│  ├─ save-schema/
│  └─ test-utils/
├─ mods/
│  ├─ core-base/
│  ├─ core-survival/
│  ├─ core-building/
│  ├─ core-crafting/
│  ├─ core-worldgen/
│  ├─ core-ui-hud/
│  └─ vanilla-bundle/
└─ docs/
```

## Package Responsibilities

### `apps/host-web`

- browser entrypoint
- Vite app shell
- boot configuration
- player-facing mod enable/disable UX

### `packages/engine-core`

- shared types
- domain events
- runtime contracts
- identifiers and package manifests

### `packages/engine-runtime`

- world container
- system scheduler
- action dispatch
- dependency graph assembly
- lifecycle orchestration

### `packages/engine-content`

- content indexing
- namespace-aware lookup
- merge validation
- dependency-aware content availability

### `packages/engine-phaser`

- Phaser integration
- scene shell
- input adapter
- render adapters
- HUD mount points

### `packages/mod-api`

- host-to-mod interfaces
- registration contracts
- lifecycle hooks
- typed capabilities

### `packages/mod-loader`

- workspace mod discovery
- manifest resolution
- dependency ordering
- external mod fetching and sandbox policy

### `packages/save-schema`

- versioned save container
- mod-scoped data persistence
- migration pipeline

## Architectural Rules

- gameplay rules must live in mods, not in the host app
- host packages must not import first-party gameplay mods
- mods may depend on other mods only through declared contracts
- render integration must consume runtime outputs, not own game rules
- all dynamic loading must terminate in the same mod contract as workspace mods

## Host Boundaries

The host is allowed to own:

- boot sequence
- rendering framework integration
- storage adapters
- trusted workspace mod assembly
- external mod fetch policy

The host is not allowed to own:

- crafting logic
- survival logic
- building logic
- content definitions for items, recipes, resources, or structures
- vanilla command behavior

## Success Criteria

- the base game can be described as a dependency graph of mods
- disabling one gameplay package removes a feature without host edits
- the host can boot with different mod sets
- external mods can target the same mod API as workspace mods

## Related

- [RFC-0002 Mod Contract And Dependency Graph](./0002-mod-contract-and-dependency-graph.md)
- [RFC-0003 Runtime Assembly, Dynamic Loading, And Save Boundaries](./0003-runtime-assembly-dynamic-loading-and-save-boundaries.md)
- [RFC-0004 Greenfield Rewrite Plan](./0004-greenfield-rewrite-plan.md)
